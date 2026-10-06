package com.jess.shop.returns.service;

import com.jess.shop.catalog.repository.ProductVariantRepository;
import com.jess.shop.common.exception.ResourceNotFoundException;
import com.jess.shop.content.service.ImageStorageService;
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
import java.util.List;
import java.util.UUID;

@Service
public class ReturnService {

    private static final Logger log = LoggerFactory.getLogger(ReturnService.class);

    private final ReturnRequestRepository returnRequestRepository;
    private final ReturnItemRepository returnItemRepository;
    private final ReturnPhotoRepository returnPhotoRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductVariantRepository variantRepository;
    private final StripeRefundService stripeRefundService;
    private final ImageStorageService imageStorageService;

    public ReturnService(ReturnRequestRepository returnRequestRepository, ReturnItemRepository returnItemRepository,
                          ReturnPhotoRepository returnPhotoRepository, OrderRepository orderRepository,
                          OrderItemRepository orderItemRepository, ProductVariantRepository variantRepository,
                          StripeRefundService stripeRefundService, ImageStorageService imageStorageService) {
        this.returnRequestRepository = returnRequestRepository;
        this.returnItemRepository = returnItemRepository;
        this.returnPhotoRepository = returnPhotoRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.variantRepository = variantRepository;
        this.stripeRefundService = stripeRefundService;
        this.imageStorageService = imageStorageService;
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

        // Neither check existed before: an orderItemId with no ownership check means a return against
        // order A could name an order item belonging to order B, and markReceivedAndRefund would happily
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

    @Transactional
    public ReturnResponse approve(UUID returnRequestId) {
        return updateStatus(returnRequestId, ReturnStatus.APPROVED);
    }

    @Transactional
    public ReturnResponse reject(UUID returnRequestId) {
        return updateStatus(returnRequestId, ReturnStatus.REJECTED);
    }

    /** Called once the physical item is back with Jess. Restocks the variant (unless it was
     * damaged/final-sale) and issues a Stripe refund for the returned line item(s). Locked, and
     * guarded against being re-run on an already-refunded request: a double-clicked button, a retried
     * request, or two admins acting on the same return would otherwise both restock and both refund --
     * and unlike a full-order cancellation, Stripe won't reliably reject a second *partial* refund of
     * the same amount if the original charge still has headroom left, so this one can't just lean on
     * Stripe's own "can't refund more than the charge" limit to catch a duplicate. */
    @Transactional
    public ReturnResponse markReceivedAndRefund(UUID returnRequestId, ResolveReturnRequest request) {
        ReturnRequest returnRequest = returnRequestRepository.findAndLockById(returnRequestId)
            .orElseThrow(() -> new ResourceNotFoundException("Return request not found: " + returnRequestId));
        if (returnRequest.getStatus() == ReturnStatus.REFUNDED) {
            throw new IllegalStateException("This return has already been refunded");
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

        if (order.getStripePaymentIntentId() != null) {
            try {
                stripeRefundService.refund(order.getStripePaymentIntentId(), refundAmount);
            } catch (StripeException e) {
                throw new RuntimeException("Failed to issue Stripe refund for return " + returnRequestId, e);
            }
        } else {
            log.warn("Return {} has no payment intent on its order -- skipping Stripe refund", returnRequestId);
        }

        returnRequest.setStatus(ReturnStatus.REFUNDED);
        returnRequest.setResolvedAt(Instant.now());
        return toResponse(returnRequestRepository.save(returnRequest));
    }

    private ReturnResponse updateStatus(UUID id, ReturnStatus status) {
        ReturnRequest returnRequest = returnRequestRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Return request not found: " + id));
        returnRequest.setStatus(status);
        if (status == ReturnStatus.REJECTED) {
            returnRequest.setResolvedAt(Instant.now());
        }
        return toResponse(returnRequestRepository.save(returnRequest));
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
        return new ReturnResponse(returnRequest.getId(), returnRequest.getOrderId(), returnRequest.getStatus(),
            returnRequest.getReason(), returnRequest.getRequestedAt(), returnRequest.getResolvedAt(), items, photoUrls);
    }
}
