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
import com.jess.shop.shipping.dto.CheckoutShippingDtos.ShippingAddressRequest;
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

    /** Called once the customer has picked a real Shippo-quoted delivery method on the checkout page --
     * address and shipping cost are both known before Stripe is ever involved now, unlike the old flow
     * where Stripe's hosted page collected the address and the customer picked a flat-rate tier. */
    @Transactional
    public Order createPendingOrder(UUID cartId, List<CartItemResponse> cartItems, ShippingAddressRequest shippingAddress,
                                     String shippingCarrier, String shippingServiceLevel, BigDecimal shippingAmount) {
        BigDecimal subtotal = cartItems.stream().map(CartItemResponse::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal amount = shippingAmount == null ? BigDecimal.ZERO : shippingAmount;

        Address address = Address.builder()
            .fullName(shippingAddress.fullName())
            .line1(shippingAddress.line1())
            .line2(shippingAddress.line2())
            .city(shippingAddress.city())
            .state(shippingAddress.state())
            .postalCode(shippingAddress.postalCode())
            .country(shippingAddress.country())
            .phone(shippingAddress.phone())
            .build();
        address = addressRepository.save(address);
        validateShippingAddress(address);

        Order order = Order.builder()
            .cartId(cartId)
            .email(shippingAddress.email() != null ? shippingAddress.email() : "")
            .status(OrderStatus.PENDING)
            .subtotal(subtotal)
            .shippingAmount(amount)
            .shippingAddressId(address.getId())
            .selectedCarrier(shippingCarrier)
            .selectedServiceLevel(shippingServiceLevel)
            .total(subtotal.add(amount)) // placeholder -- finalized once Stripe computes tax
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

    /** Called once Stripe says a Checkout Session is paid -- from its webhook, or from the confirmation page's
     * own check with Stripe (see StripePaymentService), whichever gets there first. Idempotent: the order row is
     * locked, so if both arrive at once the second waits, sees PAID and does nothing (no double stock decrement,
     * no second email). */
    @Transactional
    public void markPaid(String stripeSessionId, String paymentIntentId, String customerEmail,
                          Address shippingAddress, Address billingAddress,
                          BigDecimal taxAmount, BigDecimal shippingAmount, BigDecimal total) {
        Order order = orderRepository.findAndLockByStripeCheckoutSessionId(stripeSessionId)
            .orElseThrow(() -> new ResourceNotFoundException("No order for Stripe session: " + stripeSessionId));

        if (order.getStatus() == OrderStatus.PAID) {
            log.info("Order {} already marked PAID -- ignoring duplicate payment notification", order.getId());
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

        List<OrderItem> orderItems = orderItemRepository.findByOrderId(order.getId());
        for (OrderItem item : orderItems) {
            int updated = variantRepository.decrementStock(item.getProductVariantId(), item.getQuantity());
            if (updated == 0) {
                // Payment already succeeded -- we never fail the order over this. Flag it loudly so a
                // human handles the backorder/refund rather than silently overselling.
                log.error("OVERSOLD: order {} item {} wanted {} units of variant {} but stock was insufficient",
                    order.getId(), item.getId(), item.getQuantity(), item.getProductVariantId());
                int available = variantRepository.findById(item.getProductVariantId())
                    .map(v -> v.getStockQty())
                    .orElse(0);
                emailService.sendOversellAlert(order.getId(), item.getProductVariantId(), item.getQuantity(), available);
            }
        }

        order.setStatus(OrderStatus.PAID);
        order.setStripePaymentIntentId(paymentIntentId);
        order.setTaxAmount(taxAmount == null ? BigDecimal.ZERO : taxAmount);
        // Null here means "nothing new to report" (shipping is now set once, at checkout time, as a
        // plain line item rather than a Stripe ShippingOption -- see StripeCheckoutService) rather
        // than "reset to zero", so the real amount picked at checkout survives this update.
        if (shippingAmount != null) {
            order.setShippingAmount(shippingAmount);
        }
        order.setTotal(total == null ? order.getSubtotal() : total);
        order.setPaidAt(Instant.now());
        orderRepository.save(order);

        if (order.getCartId() != null) {
            cartItemRepository.deleteByCartId(order.getCartId());
        }

        emailService.sendOrderConfirmation(order.getEmail(), order.getId(), orderItems, shippingAddress,
            order.getSubtotal(), order.getShippingAmount(), order.getTaxAmount(), order.getTotal());
        emailService.sendNewOrderNotification(order.getId(), order.getEmail(), orderItems.size(), order.getTotal());
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

    /** The Stripe Checkout Session this order was created for; null if it never got as far as Stripe. */
    public String getStripeSessionId(UUID id) {
        return orderRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + id))
            .getStripeCheckoutSessionId();
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
     * use the returns flow instead (ReturnService.refund), which is the source of truth
     * for post-shipment refunds. */
    // Locked for the same reason ShipmentService.buyLabel locks the order row: without it, two
    // concurrent cancel requests for the same order (trivial to fire deliberately -- this is a public,
    // unauthenticated, guest-facing endpoint) both read the status before either commits, both pass the
    // not-yet-cancelled check, and both increment stock. For a PENDING order that never actually paid --
    // and so never had its stock decremented in the first place -- that's not a double-refund risk, it's
    // free, fabricated inventory, repeatable indefinitely with no payment or auth required at all.
    @Transactional
    public OrderResponse cancel(UUID id, String reason) {
        Order order = orderRepository.findAndLockById(id).orElseThrow(() -> new ResourceNotFoundException("Order not found: " + id));
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
        Order saved = orderRepository.save(order);
        emailService.sendOrderCancellation(saved.getEmail(), saved.getId(), saved.getTotal(), reason);
        return toResponse(saved);
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
        Instant shippedAt = shipment != null ? shipment.getShippedAt() : null;
        Instant deliveredAt = shipment != null ? shipment.getDeliveredAt() : null;
        return new OrderResponse(order.getId(), order.getEmail(), order.getStatus(), order.getSubtotal(), order.getTaxAmount(),
            order.getShippingAmount(), order.getTotal(), order.getCurrency(), order.getCreatedAt(), order.getPaidAt(), items,
            addressValid, addressNote, order.getSelectedCarrier(), order.getSelectedServiceLevel(),
            carrier, trackingNumber, trackingUrl, shippedAt, deliveredAt);
    }
}
