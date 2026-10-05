package com.jess.shop.payment.service;

import com.jess.shop.customer.entity.Address;
import com.jess.shop.order.entity.OrderStatus;
import com.jess.shop.order.service.OrderService;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.UUID;

/** Turns a paid Stripe Checkout Session into a PAID order. Stripe tells us about a payment two ways -- the
 * webhook, and the customer's browser landing back on the confirmation page (which then asks Stripe directly).
 * Both end up in {@link #recordPaidSession}, so an order becomes PAID even when the webhook is late, dropped, or
 * (in local dev) the Stripe CLI listener isn't running. */
@Service
public class StripePaymentService {

    private static final Logger log = LoggerFactory.getLogger(StripePaymentService.class);

    private final OrderService orderService;

    public StripePaymentService(OrderService orderService) {
        this.orderService = orderService;
    }

    /** Shared by the webhook and {@link #syncIfPending}. Safe to call twice for the same session. */
    public void recordPaidSession(Session session) {
        Address shipping = extractAddress(session);
        BigDecimal taxAmount = (session.getTotalDetails() != null && session.getTotalDetails().getAmountTax() != null)
            ? centsToAmount(session.getTotalDetails().getAmountTax()) : BigDecimal.ZERO;
        BigDecimal shippingAmount = (session.getShippingCost() != null && session.getShippingCost().getAmountSubtotal() != null)
            ? centsToAmount(session.getShippingCost().getAmountSubtotal()) : BigDecimal.ZERO;
        BigDecimal total = session.getAmountTotal() != null ? centsToAmount(session.getAmountTotal()) : null;
        String email = session.getCustomerDetails() != null ? session.getCustomerDetails().getEmail() : null;

        orderService.markPaid(session.getId(), session.getPaymentIntent(), email, shipping, null, taxAmount, shippingAmount, total);
    }

    /** Called when the customer lands on the confirmation page: if the order is still PENDING, ask Stripe whether
     * the session was actually paid, and record it if so. Never throws for a Stripe outage -- the page just keeps
     * polling and the webhook may still arrive. An unknown session id is a 404 from the order lookup. */
    public void syncIfPending(String sessionId) {
        if (orderService.getByStripeSessionId(sessionId).status() != OrderStatus.PENDING) {
            return;
        }
        try {
            Session session = Session.retrieve(sessionId);
            if ("paid".equals(session.getPaymentStatus())) {
                log.info("Session {} is paid at Stripe but its order was still PENDING -- recording payment now", sessionId);
                recordPaidSession(session);
            }
        } catch (StripeException e) {
            log.warn("Could not check Checkout Session {} with Stripe -- will retry on the next poll", sessionId, e);
        }
    }

    /** Same check, starting from our order id (admin recovery). An order that never reached Stripe Checkout has no
     * session to ask about, so there is nothing to do for it. */
    public void syncOrderIfPending(UUID orderId) {
        String sessionId = orderService.getStripeSessionId(orderId);
        if (sessionId != null) {
            syncIfPending(sessionId);
        }
    }

    private Address extractAddress(Session session) {
        // Shipping address lives under collected_information.shipping_details in this API version
        // (older integrations may know it as session.shipping_details -- Stripe renamed/moved this).
        if (session.getCollectedInformation() == null || session.getCollectedInformation().getShippingDetails() == null) {
            return null;
        }
        var shippingDetails = session.getCollectedInformation().getShippingDetails();
        com.stripe.model.Address addr = shippingDetails.getAddress();
        if (addr == null) {
            return null;
        }
        return Address.builder()
            .fullName(shippingDetails.getName())
            .line1(addr.getLine1())
            .line2(addr.getLine2())
            .city(addr.getCity())
            .state(addr.getState())
            .postalCode(addr.getPostalCode())
            .country(addr.getCountry())
            .build();
    }

    private BigDecimal centsToAmount(Long cents) {
        return BigDecimal.valueOf(cents).divide(BigDecimal.valueOf(100));
    }
}
