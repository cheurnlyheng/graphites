package com.jess.shop.returns.service;

import com.jess.shop.catalog.repository.ProductVariantRepository;
import com.jess.shop.common.exception.ResourceNotFoundException;
import com.jess.shop.content.service.ImageStorageService;
import com.jess.shop.notification.service.EmailService;
import com.jess.shop.order.entity.Order;
import com.jess.shop.order.entity.OrderItem;
import com.jess.shop.order.entity.OrderStatus;
import com.jess.shop.order.repository.OrderItemRepository;
import com.jess.shop.order.repository.OrderRepository;
import com.jess.shop.payment.service.StripeRefundService;
import com.jess.shop.returns.dto.ReturnDtos.*;
import com.jess.shop.returns.entity.ReturnItem;
import com.jess.shop.returns.entity.ReturnPhoto;
import com.jess.shop.returns.entity.ReturnRequest;
import com.jess.shop.returns.entity.ReturnStatus;
import com.jess.shop.returns.repository.ReturnItemRepository;
import com.jess.shop.returns.repository.ReturnPhotoRepository;
import com.jess.shop.returns.repository.ReturnRequestRepository;
import com.jess.shop.shipping.dto.AdminShippingDtos.BuyLabelRequest;
import com.jess.shop.shipping.dto.AdminShippingDtos.ShipmentDto;
import com.jess.shop.shipping.dto.AdminShippingDtos.ShippingRatesResponse;
import com.jess.shop.shipping.entity.Shipment;
import com.jess.shop.shipping.repository.ShipmentRepository;
import com.jess.shop.shipping.service.ShipmentService;
import com.stripe.exception.StripeException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class ReturnService {

    private static final Logger log = LoggerFactory.getLogger(ReturnService.class);

    // Shown to the customer and checked server-side -- see create() below. Also the number quoted on
    // the storefront's return-policy copy, so keep the two in sync if this ever changes.
    private static final int RETURN_WINDOW_DAYS = 30;
    private static final int MIN_CONDITION_PHOTOS = 2;

    private final ReturnRequestRepository returnRequestRepository;
    private final ReturnItemRepository returnItemRepository;
    private final ReturnPhotoRepository returnPhotoRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductVariantRepository variantRepository;
    private final StripeRefundService stripeRefundService;
    private final ImageStorageService imageStorageService;
    private final ShipmentRepository shipmentRepository;
    private final ShipmentService shipmentService;
    private final EmailService emailService;

    public ReturnService(ReturnRequestRepository returnRequestRepository, ReturnItemRepository returnItemRepository,
                          ReturnPhotoRepository returnPhotoRepository, OrderRepository orderRepository,
                          OrderItemRepository orderItemRepository, ProductVariantRepository variantRepository,
                          StripeRefundService stripeRefundService, ImageStorageService imageStorageService,
                          ShipmentRepository shipmentRepository, ShipmentService shipmentService, EmailService emailService) {
        this.returnRequestRepository = returnRequestRepository;
        this.returnItemRepository = returnItemRepository;
        this.returnPhotoRepository = returnPhotoRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.variantRepository = variantRepository;
        this.stripeRefundService = stripeRefundService;
        this.imageStorageService = imageStorageService;
        this.shipmentRepository = shipmentRepository;
        this.shipmentService = shipmentService;
        this.emailService = emailService;
    }

    /** Lets a guest attach condition-proof photos to a return before/while filling out the rest of the
     * form -- no admin auth available to them, so this can't reuse the admin uploads endpoint. Never
     * trims transparent padding (that's a hanging-rail-cutout-only concern, irrelevant here). */
    public String uploadPhoto(MultipartFile file) throws IOException {
        return imageStorageService.store(file, false).url();
    }

    @Transactional
    public ReturnResponse create(UUID orderId, CreateReturnRequest request) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        // A return means sending back something you've physically received -- before delivery, the
        // right self-service action is cancelling the order instead (OrderController.cancel, which
        // only allows PAID/not-yet-shipped). Enforced here too, not just hidden in the storefront UI,
        // since nothing stops a direct API call from skipping that UI gate.
        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new IllegalStateException("Only a delivered order can be returned -- this order is " + order.getStatus());
        }

        // The outbound shipment's deliveredAt is the actual delivery date -- Order itself doesn't carry
        // one (see OrderService.toResponse, which reads it off the Shipment the same way). A null here
        // would mean the order is DELIVERED with no shipment record at all, which shouldn't happen; that
        // inconsistency isn't this customer's fault, so it's let through rather than blocked.
        Shipment outboundShipment = shipmentRepository.findFirstByOrderIdAndReturnLabelFalseOrderByShippedAtDesc(orderId).orElse(null);
        Instant deliveredAt = outboundShipment != null ? outboundShipment.getDeliveredAt() : null;
        if (deliveredAt != null && deliveredAt.isBefore(Instant.now().minus(RETURN_WINDOW_DAYS, ChronoUnit.DAYS))) {
            throw new IllegalStateException("This order was delivered on " + deliveredAt
                + ", more than " + RETURN_WINDOW_DAYS + " days ago, so it's no longer eligible for a return. See our return policy for details.");
        }

        if (request.photoUrls().size() < MIN_CONDITION_PHOTOS) {
            throw new IllegalStateException("Please include at least " + MIN_CONDITION_PHOTOS + " photos of the item's condition (front and back).");
        }

        // Neither check existed before: an orderItemId with no ownership check means a return against
        // order A could name an order item belonging to order B, and refund() would happily
        // refund order A's payment intent using order B's (possibly far higher) item price. And with no
        // cap on quantity, the same single purchased unit could be claimed back piecemeal across several
        // return requests until its cumulative refunded quantity far exceeds what was ever bought.
        for (ReturnItemRequest itemReq : request.items()) {
            OrderItem orderItem = orderItemRepository.findById(itemReq.orderItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Order item not found: " + itemReq.orderItemId()));
            if (!orderItem.getOrderId().equals(orderId)) {
                throw new IllegalStateException("Order item " + itemReq.orderItemId() + " does not belong to order " + orderId);
            }
            // Excludes rejected prior claims -- otherwise a single admin rejection would permanently
            // block ever returning that item again, since the rejected quantity would still count
            // against the cap forever.
            int alreadyClaimed = returnItemRepository.findByOrderItemId(itemReq.orderItemId()).stream()
                .filter(ri -> returnRequestRepository.findById(ri.getReturnRequestId())
                    .map(rr -> rr.getStatus() != ReturnStatus.REJECTED).orElse(false))
                .mapToInt(ReturnItem::getQuantity).sum();
            if (alreadyClaimed + itemReq.quantity() > orderItem.getQuantity()) {
                throw new IllegalStateException("Cannot return " + itemReq.quantity() + " of \"" + orderItem.getProductNameSnapshot()
                    + "\" -- only " + (orderItem.getQuantity() - alreadyClaimed) + " of " + orderItem.getQuantity() + " purchased remain returnable");
            }
        }

        ReturnRequest returnRequest = ReturnRequest.builder()
            .orderId(orderId)
            .customerId(order.getCustomerId())
            .status(ReturnStatus.REQUESTED)
            .reason(request.reason())
            .build();
        returnRequest = returnRequestRepository.save(returnRequest);

        for (ReturnItemRequest itemReq : request.items()) {
            ReturnItem item = ReturnItem.builder()
                .returnRequestId(returnRequest.getId())
                .orderItemId(itemReq.orderItemId())
                .quantity(itemReq.quantity())
                .reason(itemReq.reason())
                .build();
            returnItemRepository.save(item);
        }

        int sortOrder = 0;
        for (String url : request.photoUrls()) {
            returnPhotoRepository.save(ReturnPhoto.builder()
                .returnRequestId(returnRequest.getId())
                .url(url)
                .sortOrder(sortOrder++)
                .build());
        }

        emailService.sendNewReturnNotification(returnRequest.getId(), orderId, order.getEmail(), request.reason(), request.photoUrls());

        return toResponse(returnRequest);
    }

    public List<ReturnResponse> listForCustomer(UUID customerId) {
        return returnRequestRepository.findByCustomerId(customerId).stream().map(this::toResponse).toList();
    }

    public Page<ReturnResponse> adminList(ReturnStatus status, Pageable pageable) {
        Page<ReturnRequest> page = status == null
            ? returnRequestRepository.findAll(pageable)
            : returnRequestRepository.findByStatus(status, pageable);
        return page.map(this::toResponse);
    }

    /** Approving only means "this claim looks legitimate enough to authorize shipping it back" -- it
     * does NOT refund anything yet (see refund() below for why: the item hasn't actually been received
     * or inspected at this point, so refunding here would pay out before confirming the customer ever
     * sends anything back, or that what comes back matches what was claimed). shopFault decides who
     * eventually pays for the return label. */
    @Transactional
    public ReturnResponse approve(UUID returnRequestId, boolean shopFault) {
        ReturnRequest returnRequest = returnRequestRepository.findById(returnRequestId)
            .orElseThrow(() -> new ResourceNotFoundException("Return request not found: " + returnRequestId));
        returnRequest.setStatus(ReturnStatus.APPROVED);
        returnRequest.setShopFault(shopFault);
        return toResponse(returnRequestRepository.save(returnRequest));
    }

    /** Reachable from any status, including after approval or even after the item's been marked
     * received -- a return that doesn't hold up on physical inspection needs to be deniable here too,
     * not just at the initial paperwork stage. */
    @Transactional
    public ReturnResponse reject(UUID returnRequestId, RejectReturnRequest request) {
        ReturnRequest returnRequest = returnRequestRepository.findById(returnRequestId)
            .orElseThrow(() -> new ResourceNotFoundException("Return request not found: " + returnRequestId));
        returnRequest.setStatus(ReturnStatus.REJECTED);
        returnRequest.setResolvedAt(Instant.now());
        returnRequest = returnRequestRepository.save(returnRequest);

        Order order = orderRepository.findById(returnRequest.getOrderId()).orElse(null);
        if (order != null) {
            emailService.sendReturnRejected(order.getEmail(), returnRequestId, request != null ? request.note() : null);
        }
        return toResponse(returnRequest);
    }

    /** Rate quote for the return label -- reversed direction from every other shipping quote in this
     * app (customer's address -> warehouse). See ShipmentService.getReturnRatesForOrder. */
    public ShippingRatesResponse getReturnRates(UUID returnRequestId) {
        ReturnRequest returnRequest = returnRequestRepository.findById(returnRequestId)
            .orElseThrow(() -> new ResourceNotFoundException("Return request not found: " + returnRequestId));
        return shipmentService.getReturnRatesForOrder(returnRequest.getOrderId());
    }

    /** The shop always buys the return label (regardless of who's at fault) -- that's what gives real
     * tracking visibility instead of just trusting the customer's word that something's on its way.
     * Fault (set at approve time) only decides whether this cost comes out of the eventual refund. */
    @Transactional
    public ReturnResponse buyReturnLabel(UUID returnRequestId, BuyLabelRequest request) {
        ReturnRequest returnRequest = returnRequestRepository.findById(returnRequestId)
            .orElseThrow(() -> new ResourceNotFoundException("Return request not found: " + returnRequestId));
        if (returnRequest.getStatus() != ReturnStatus.APPROVED) {
            throw new IllegalStateException("Approve this return before buying a return label (currently " + returnRequest.getStatus() + ")");
        }

        BuyLabelRequest returnLabelRequest = new BuyLabelRequest(request.rateObjectId(), request.carrier(), request.amount(), returnRequestId, true);
        ShipmentDto shipment = shipmentService.buyLabel(returnRequest.getOrderId(), returnLabelRequest);

        Order order = orderRepository.findById(returnRequest.getOrderId()).orElse(null);
        if (order != null) {
            emailService.sendReturnLabel(order.getEmail(), returnRequestId, shipment.labelUrl(), shipment.trackingNumber(), shipment.carrier());
        }
        return toResponse(returnRequest);
    }

    /** Acknowledges the physical item is back with Jess -- separate from refunding it (see refund()).
     * Nothing about buying a return label is required first: some returns show up without ever using
     * one (dropped off in person, a customer-arranged shipment), so this only checks that the return
     * was actually approved. */
    @Transactional
    public ReturnResponse markReceived(UUID returnRequestId) {
        ReturnRequest returnRequest = returnRequestRepository.findById(returnRequestId)
            .orElseThrow(() -> new ResourceNotFoundException("Return request not found: " + returnRequestId));
        if (returnRequest.getStatus() != ReturnStatus.APPROVED) {
            throw new IllegalStateException("Only an approved return can be marked as received (currently " + returnRequest.getStatus() + ")");
        }
        returnRequest.setStatus(ReturnStatus.RECEIVED);
        return toResponse(returnRequestRepository.save(returnRequest));
    }

    /** Only reachable once the item has actually been marked RECEIVED -- refunding any earlier would
     * pay out before confirming the customer ever shipped anything back, or that what came back matches
     * what they claimed (see approve() and markReceived()). Restocks the variant (unless it was
     * damaged/final-sale) and issues a Stripe refund for the returned line item(s), minus the return
     * label's cost if this was a customer-fault return. Locked, and guarded against being re-run on an
     * already-refunded request: a double-clicked button, a retried request, or two admins acting on the
     * same return would otherwise both restock and both refund -- and unlike a full-order cancellation,
     * Stripe won't reliably reject a second *partial* refund of the same amount if the original charge
     * still has headroom left, so this one can't just lean on Stripe's own "can't refund more than the
     * charge" limit to catch a duplicate. */
    @Transactional
    public ReturnResponse refund(UUID returnRequestId, ResolveReturnRequest request) {
        ReturnRequest returnRequest = returnRequestRepository.findAndLockById(returnRequestId)
            .orElseThrow(() -> new ResourceNotFoundException("Return request not found: " + returnRequestId));
        if (returnRequest.getStatus() == ReturnStatus.REFUNDED) {
            throw new IllegalStateException("This return has already been refunded");
        }
        if (returnRequest.getStatus() != ReturnStatus.RECEIVED) {
            throw new IllegalStateException("Mark this return as received (and inspected) before refunding it (currently " + returnRequest.getStatus() + ")");
        }
        Order order = orderRepository.findById(returnRequest.getOrderId())
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + returnRequest.getOrderId()));

        List<ReturnItem> items = returnItemRepository.findByReturnRequestId(returnRequestId);
        BigDecimal refundAmount = BigDecimal.ZERO;

        for (ReturnItem returnItem : items) {
            OrderItem orderItem = orderItemRepository.findById(returnItem.getOrderItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Order item not found: " + returnItem.getOrderItemId()));
            refundAmount = refundAmount.add(orderItem.getUnitPrice().multiply(BigDecimal.valueOf(returnItem.getQuantity())));

            if (request.restock() && orderItem.getProductVariantId() != null) {
                variantRepository.incrementStock(orderItem.getProductVariantId(), returnItem.getQuantity());
            }
        }

        // Customer-fault (false) deducts the return label's cost from the refund; shop-fault (true) or
        // unset (benefit of the doubt -- shouldn't happen once approve() always sets this, but a refund
        // should never silently dock money over a missing flag) means the shop absorbs it instead.
        BigDecimal labelDeduction = BigDecimal.ZERO;
        if (Boolean.FALSE.equals(returnRequest.getShopFault())) {
            labelDeduction = shipmentRepository.findFirstByReturnRequestIdOrderByCreatedAtDesc(returnRequestId)
                .map(Shipment::getCost).orElse(BigDecimal.ZERO);
        }
        BigDecimal finalRefund = refundAmount.subtract(labelDeduction).max(BigDecimal.ZERO);

        if (finalRefund.compareTo(BigDecimal.ZERO) > 0) {
            if (order.getStripePaymentIntentId() != null) {
                try {
                    stripeRefundService.refund(order.getStripePaymentIntentId(), finalRefund);
                } catch (StripeException e) {
                    throw new RuntimeException("Failed to issue Stripe refund for return " + returnRequestId, e);
                }
            } else {
                log.warn("Return {} has no payment intent on its order -- skipping Stripe refund", returnRequestId);
            }
        }

        returnRequest.setStatus(ReturnStatus.REFUNDED);
        returnRequest.setResolvedAt(Instant.now());
        ReturnRequest saved = returnRequestRepository.save(returnRequest);
        emailService.sendReturnRefunded(order.getEmail(), returnRequestId, finalRefund, labelDeduction);
        return toResponse(saved);
    }

    private ReturnResponse toResponse(ReturnRequest returnRequest) {
        List<ReturnItemResponse> items = returnItemRepository.findByReturnRequestId(returnRequest.getId()).stream()
            .map(i -> {
                String productName = orderItemRepository.findById(i.getOrderItemId())
                    .map(OrderItem::getProductNameSnapshot).orElse("(unknown)");
                return new ReturnItemResponse(i.getId(), i.getOrderItemId(), productName, i.getQuantity(), i.getReason());
            })
            .toList();
        List<String> photoUrls = returnPhotoRepository.findByReturnRequestIdOrderBySortOrderAsc(returnRequest.getId())
            .stream().map(ReturnPhoto::getUrl).toList();
        Shipment returnLabel = shipmentRepository.findFirstByReturnRequestIdOrderByCreatedAtDesc(returnRequest.getId()).orElse(null);
        return new ReturnResponse(returnRequest.getId(), returnRequest.getOrderId(), returnRequest.getStatus(),
            returnRequest.getReason(), returnRequest.getRequestedAt(), returnRequest.getResolvedAt(), returnRequest.getShopFault(),
            returnLabel != null ? returnLabel.getLabelUrl() : null,
            returnLabel != null ? returnLabel.getTrackingUrl() : null,
            returnLabel != null ? returnLabel.getCost() : null,
            items, photoUrls);
    }
}
