package com.jess.shop.payment.service;

import com.jess.shop.customer.entity.Address;
import com.jess.shop.order.service.OrderService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class StripeWebhookService {

    private static final Logger log = LoggerFactory.getLogger(StripeWebhookService.class);

    private final OrderService orderService;

    @Value("${stripe.webhook-secret}")
    private String webhookSecret;

    public StripeWebhookService(OrderService orderService) {
        this.orderService = orderService;
    }

    public void handle(String payload, String sigHeader) {
        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            throw new IllegalArgumentException("Invalid Stripe webhook signature", e);
        }

        if ("checkout.session.completed".equals(event.getType())) {
            EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
            Session session = (Session) deserializer.getObject().orElse(null);
            if (session == null) {
                log.warn("Could not deserialize checkout.session.completed payload for event {}", event.getId());
                return;
            }
            handleSessionCompleted(session);
        } else {
            log.debug("Ignoring unhandled Stripe event type: {}", event.getType());
        }
    }

    private void handleSessionCompleted(Session session) {
        Address shipping = extractAddress(session);
        BigDecimal taxAmount = (session.getTotalDetails() != null && session.getTotalDetails().getAmountTax() != null)
            ? centsToAmount(session.getTotalDetails().getAmountTax()) : BigDecimal.ZERO;
        BigDecimal shippingAmount = (session.getShippingCost() != null && session.getShippingCost().getAmountSubtotal() != null)
            ? centsToAmount(session.getShippingCost().getAmountSubtotal()) : BigDecimal.ZERO;
        BigDecimal total = session.getAmountTotal() != null ? centsToAmount(session.getAmountTotal()) : null;
        String email = session.getCustomerDetails() != null ? session.getCustomerDetails().getEmail() : null;

        orderService.markPaid(session.getId(), session.getPaymentIntent(), email, shipping, null, taxAmount, shippingAmount, total);
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
