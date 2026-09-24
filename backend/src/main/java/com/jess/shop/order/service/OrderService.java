package com.jess.shop.order.service;

import com.jess.shop.cart.dto.CartDtos.CartItemResponse;
import com.jess.shop.cart.repository.CartItemRepository;
import com.jess.shop.catalog.repository.ProductVariantRepository;
import com.jess.shop.common.exception.ResourceNotFoundException;
import com.jess.shop.customer.entity.Address;
import com.jess.shop.customer.entity.Customer;
import com.jess.shop.customer.repository.AddressRepository;
import com.jess.shop.customer.repository.CustomerRepository;
import com.jess.shop.notification.service.EmailService;
import com.jess.shop.order.dto.OrderDtos.OrderItemResponse;
import com.jess.shop.order.dto.OrderDtos.OrderResponse;
import com.jess.shop.order.entity.Order;
import com.jess.shop.order.entity.OrderItem;
import com.jess.shop.order.entity.OrderStatus;
import com.jess.shop.order.repository.OrderItemRepository;
import com.jess.shop.order.repository.OrderRepository;
import com.jess.shop.payment.service.StripeRefundService;
import com.jess.shop.shipping.dto.ShippoDtos.AddressPayload;
import com.jess.shop.shipping.dto.ShippoDtos.AddressValidationResponse;
import com.jess.shop.shipping.entity.Shipment;
import com.jess.shop.shipping.repository.ShipmentRepository;
import com.jess.shop.shipping.service.ShippoService;
import com.stripe.exception.StripeException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductVariantRepository variantRepository;
    private final CustomerRepository customerRepository;
    private final AddressRepository addressRepository;
    private final EmailService emailService;
    private final StripeRefundService stripeRefundService;
    private final ShippoService shippoService;
    private final CartItemRepository cartItemRepository;
    private final ShipmentRepository shipmentRepository;

    public OrderService(OrderRepository orderRepository, OrderItemRepository orderItemRepository,
                         ProductVariantRepository variantRepository, CustomerRepository customerRepository,
                         AddressRepository addressRepository, EmailService emailService,
                         StripeRefundService stripeRefundService, ShippoService shippoService,
                         CartItemRepository cartItemRepository, ShipmentRepository shipmentRepository) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.variantRepository = variantRepository;
        this.customerRepository = customerRepository;
        this.shippoService = shippoService;
        this.addressRepository = addressRepository;
        this.emailService = emailService;
        this.stripeRefundService = stripeRefundService;
        this.cartItemRepository = cartItemRepository;
        this.shipmentRepository = shipmentRepository;
    }

    @Transactional
    public Order createPendingOrder(UUID cartId, List<CartItemResponse> cartItems) {
        BigDecimal subtotal = cartItems.stream().map(CartItemResponse::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);

        Order order = Order.builder()
            .cartId(cartId)
            .email("") // filled in from Stripe's collected customer_details.email once payment completes
            .status(OrderStatus.PENDING)
            .subtotal(subtotal)
            .total(subtotal) // placeholder -- finalized once Stripe computes tax + shipping
            .currency("USD")
            .createdAt(Instant.now())
            .build();
        order = orderRepository.save(order);

        for (CartItemResponse item : cartItems) {
            OrderItem orderItem = OrderItem.builder()
                .orderId(order.getId())
                .productVariantId(item.productVariantId())
                .productNameSnapshot(item.productName())
                .variantAttributesSnapshot(item.variantAttributes())
                .unitPrice(item.unitPrice())
                .quantity(item.quantity())
                .lineTotal(item.lineTotal())
                .build();
            orderItemRepository.save(orderItem);
        }

        return order;
    }

    public void attachStripeSession(UUID orderId, String sessionId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        order.setStripeCheckoutSessionId(sessionId);
        orderRepository.save(order);
    }

    /** Called from the Stripe webhook once payment is confirmed. Idempotent: a re-delivered event is a no-op. */
    @Transactional
    public void markPaid(String stripeSessionId, String paymentIntentId, String customerEmail,
                          Address shippingAddress, Address billingAddress,
                          BigDecimal taxAmount, BigDecimal shippingAmount, BigDecimal total) {
        Order order = orderRepository.findByStripeCheckoutSessionId(stripeSessionId)
            .orElseThrow(() -> new ResourceNotFoundException("No order for Stripe session: " + stripeSessionId));

        if (order.getStatus() == OrderStatus.PAID) {
            log.info("Order {} already marked PAID -- ignoring duplicate webhook delivery", order.getId());
            return;
        }

        if (customerEmail != null && !customerEmail.isBlank()) {
            order.setEmail(customerEmail);
        }

        // Link (or create) a Customer record so a guest order can later be "claimed" via registration.
        if (order.getCustomerId() == null) {
            Customer customer = customerRepository.findByEmail(order.getEmail())
                .orElseGet(() -> customerRepository.save(Customer.builder().email(order.getEmail()).build()));
            order.setCustomerId(customer.getId());
        }

        if (shippingAddress != null) {
            shippingAddress.setCustomerId(order.getCustomerId());
            shippingAddress = addressRepository.save(shippingAddress);
            order.setShippingAddressId(shippingAddress.getId());
            validateShippingAddress(shippingAddress);
        }
        if (billingAddress != null) {
            billingAddress.setCustomerId(order.getCustomerId());
            billingAddress = addressRepository.save(billingAddress);
            order.setBillingAddressId(billingAddress.getId());
        }

        for (OrderItem item : orderItemRepository.findByOrderId(order.getId())) {
            int updated = variantRepository.decrementStock(item.getProductVariantId(), item.getQuantity());
            if (updated == 0) {
                // Payment already succeeded -- we never fail the order over this. Flag it loudly so a
                // human handles the backorder/refund rather than silently overselling.
                log.error("OVERSOLD: order {} item {} wanted {} units of variant {} but stock was insufficient",
                    order.getId(), item.getId(), item.getQuantity(), item.getProductVariantId());
            }
        }

        order.setStatus(OrderStatus.PAID);
        order.setStripePaymentIntentId(paymentIntentId);
        order.setTaxAmount(taxAmount == null ? BigDecimal.ZERO : taxAmount);
        order.setShippingAmount(shippingAmount == null ? BigDecimal.ZERO : shippingAmount);
        order.setTotal(total == null ? order.getSubtotal() : total);
        order.setPaidAt(Instant.now());
        orderRepository.save(order);

        if (order.getCartId() != null) {
            cartItemRepository.deleteByCartId(order.getCartId());
        }

        emailService.sendOrderConfirmation(order.getEmail(), order.getId(), order.getTotal());
    }

    /** Checked right when the order comes in (not at checkout -- Stripe's hosted page collects the
     * address itself, after our code has already run) so a bad address shows up as a clear admin
     * warning immediately, instead of as a confusing "could not create label" failure days later when
     * someone finally tries to ship it. Never blocks the order: Shippo being down/wrong is not a reason
     * to fail a payment that already succeeded. */
    private void validateShippingAddress(Address address) {
        try {
            AddressValidationResponse response = shippoService.validateAddress(new AddressPayload(
                address.getFullName(), address.getLine1(), address.getLine2(), address.getCity(),
                address.getState(), address.getPostalCode(), address.getCountry(), address.getPhone(), null
            ));
            boolean isValid = response.validationResults() != null && response.validationResults().isValid();
            String note = (response.validationResults() == null || response.validationResults().messages() == null) ? null
                : response.validationResults().messages().stream().map(m -> m.text()).reduce((a, b) -> a + "; " + b).orElse(null);
            address.setAddressValid(isValid);
            address.setAddressValidationNote(note);
            addressRepository.save(address);
        } catch (Exception e) {
            log.warn("Could not validate shipping address {} against Shippo -- leaving unvalidated", address.getId(), e);
        }
    }

    public OrderResponse getById(UUID id) {
        return toResponse(orderRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Order not found: " + id)));
    }

    /** Used by the order-confirmation page: Stripe's success_url only carries the Checkout Session id. */
    public OrderResponse getByStripeSessionId(String sessionId) {
        return toResponse(orderRepository.findByStripeCheckoutSessionId(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("No order for Stripe session: " + sessionId)));
    }

    public Page<OrderResponse> adminListByStatus(OrderStatus status, Pageable pageable) {
        Page<Order> page = status == null
            ? orderRepository.findAllByOrderByCreatedAtDesc(pageable)
            : orderRepository.findByStatusOrderByCreatedAtAsc(status, pageable);
        return page.map(this::toResponse);
    }

    /** Admin-initiated cancellation of an order that hasn't shipped yet -- refunds the full payment via
     * Stripe and puts the stock back. Once an order has shipped, cancellation isn't meaningful anymore;
     * use the returns flow instead (ReturnService.markReceivedAndRefund), which is the source of truth
     * for post-shipment refunds. */
    @Transactional
    public OrderResponse cancel(UUID id) {
        Order order = orderRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Order not found: " + id));
        if (order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.PAID) {
            throw new IllegalStateException("Only a pending or paid (unshipped) order can be cancelled -- this order is " + order.getStatus());
        }

        for (OrderItem item : orderItemRepository.findByOrderId(order.getId())) {
            if (item.getProductVariantId() != null) {
                variantRepository.incrementStock(item.getProductVariantId(), item.getQuantity());
            }
        }

        if (order.getStripePaymentIntentId() != null) {
            try {
                stripeRefundService.refund(order.getStripePaymentIntentId(), null);
            } catch (StripeException e) {
                throw new RuntimeException("Failed to refund Stripe payment for order " + id, e);
            }
        }

        order.setStatus(OrderStatus.CANCELLED);
        return toResponse(orderRepository.save(order));
    }

    private OrderResponse toResponse(Order order) {
        List<OrderItemResponse> items = orderItemRepository.findByOrderId(order.getId()).stream()
            .map(i -> new OrderItemResponse(i.getId(), i.getProductNameSnapshot(), i.getVariantAttributesSnapshot(),
                i.getUnitPrice(), i.getQuantity(), i.getLineTotal()))
            .toList();
        Boolean addressValid = null;
        String addressNote = null;
        if (order.getShippingAddressId() != null) {
            Address address = addressRepository.findById(order.getShippingAddressId()).orElse(null);
            if (address != null) {
                addressValid = address.getAddressValid();
                addressNote = address.getAddressValidationNote();
            }
        }
        Shipment shipment = shipmentRepository.findFirstByOrderIdAndReturnLabelFalseOrderByShippedAtDesc(order.getId()).orElse(null);
        String carrier = shipment != null ? shipment.getCarrier() : null;
        String trackingNumber = shipment != null ? shipment.getTrackingNumber() : null;
        String trackingUrl = shipment != null ? shipment.getTrackingUrl() : null;
        return new OrderResponse(order.getId(), order.getEmail(), order.getStatus(), order.getSubtotal(), order.getTaxAmount(),
            order.getShippingAmount(), order.getTotal(), order.getCurrency(), order.getCreatedAt(), order.getPaidAt(), items,
            addressValid, addressNote, carrier, trackingNumber, trackingUrl);
    }
}
