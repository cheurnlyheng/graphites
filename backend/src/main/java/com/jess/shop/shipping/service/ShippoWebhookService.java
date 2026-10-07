package com.jess.shop.shipping.service;

import com.jess.shop.notification.service.EmailService;
import com.jess.shop.order.entity.Order;
import com.jess.shop.order.entity.OrderStatus;
import com.jess.shop.order.repository.OrderRepository;
import com.jess.shop.shipping.dto.ShippoDtos.TrackingWebhookPayload;
import com.jess.shop.shipping.entity.Shipment;
import com.jess.shop.shipping.repository.ShipmentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.List;

/** Closes the loop that buying a label and marking an order SHIPPED (see ShipmentService) leaves
 * open: nothing else tells this shop when the carrier actually picked the package up or delivered
 * it. This is that signal, arriving as Shippo's track_updated webhook -- reacts to TRANSIT (first
 * carrier scan) and DELIVERED, and emails the customer on both. */
@Service
public class ShippoWebhookService {

    private static final Logger log = LoggerFactory.getLogger(ShippoWebhookService.class);

    private final ShipmentRepository shipmentRepository;
    private final OrderRepository orderRepository;
    private final EmailService emailService;

    @Value("${shippo.webhook-token}")
    private String webhookToken;

    public ShippoWebhookService(ShipmentRepository shipmentRepository, OrderRepository orderRepository, EmailService emailService) {
        this.shipmentRepository = shipmentRepository;
        this.orderRepository = orderRepository;
        this.emailService = emailService;
    }

    @Transactional
    public void handle(String suppliedToken, TrackingWebhookPayload payload) {
        if (webhookToken != null && !webhookToken.isBlank() && !constantTimeEquals(webhookToken, suppliedToken)) {
            throw new IllegalArgumentException("Invalid Shippo webhook token");
        }

        String status = payload.data() != null && payload.data().trackingStatus() != null
            ? payload.data().trackingStatus().status() : null;
        String trackingNumber = payload.data() != null ? payload.data().trackingNumber() : null;

        boolean isDelivered = "DELIVERED".equalsIgnoreCase(status);
        boolean isTransit = "TRANSIT".equalsIgnoreCase(status);
        // PRE_TRANSIT, RETURNED and FAILURE still arrive on this same webhook, but nothing in this
        // shop reacts to them -- TRANSIT (first carrier scan) and DELIVERED are the two statuses this
        // project's order journey models.
        if ((!isDelivered && !isTransit) || trackingNumber == null) {
            log.debug("Ignoring Shippo tracking update: status={}, trackingNumber={}", status, trackingNumber);
            return;
        }

        // A return label's own movement isn't the customer's forward shipment, and a shipment already
        // marked delivered means this is a duplicate/late event for an already-closed shipment -- both
        // are filtered out here rather than only matched against a single row, since real carriers issue
        // unique tracking numbers but Shippo's own test/sandbox carriers don't (see ShipmentRepository).
        List<Shipment> candidates = shipmentRepository.findAllByTrackingNumber(trackingNumber).stream()
            .filter(s -> !s.isReturnLabel() && s.getDeliveredAt() == null)
            .toList();
        if (candidates.isEmpty()) {
            log.warn("Shippo reported {} for a tracking number this shop doesn't recognize (or it's already resolved): {}", status, trackingNumber);
            return;
        }
        if (candidates.size() > 1) {
            // Can't tell which shipment Shippo actually means -- happens with sandbox tracking numbers
            // that aren't unique (see ShipmentRepository.findAllByTrackingNumber); never guess with money
            // and order status on the line, just skip and let an admin sort it out manually if it matters.
            log.warn("Tracking number {} matches {} shipments -- can't tell which one Shippo means, skipping", trackingNumber, candidates.size());
            return;
        }

        Shipment shipment = candidates.get(0);

        if (isTransit) {
            if (shipment.getInTransitAt() != null) {
                return; // already recorded -- carriers can report TRANSIT more than once, no DB lookups needed
            }
            shipment.setInTransitAt(parseStatusDate(payload.data().trackingStatus().statusDate()));
            shipmentRepository.save(shipment);
            Order order = orderRepository.findById(shipment.getOrderId()).orElse(null);
            if (order != null && order.getStatus() == OrderStatus.SHIPPED) {
                emailService.sendInTransitUpdate(order.getEmail(), order.getId(), shipment.getCarrier(), shipment.getTrackingUrl());
            }
            return;
        }

        shipment.setDeliveredAt(parseStatusDate(payload.data().trackingStatus().statusDate()));
        shipmentRepository.save(shipment);

        Order order = orderRepository.findById(shipment.getOrderId()).orElse(null);
        if (order != null && order.getStatus() == OrderStatus.SHIPPED) {
            order.setStatus(OrderStatus.DELIVERED);
            orderRepository.save(order);
            emailService.sendDeliveryConfirmation(order.getEmail(), order.getId());
        }
    }

    // Plain String.equals short-circuits on the first mismatched byte, making the comparison time
    // depend on how many leading characters the guess gets right -- in principle lets an attacker
    // recover this token character-by-character via timing, rather than needing the whole thing at
    // once. MessageDigest.isEqual is the standard constant-time comparison for exactly this case.
    private static boolean constantTimeEquals(String expected, String actual) {
        if (actual == null) {
            return false;
        }
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), actual.getBytes(StandardCharsets.UTF_8));
    }

    private Instant parseStatusDate(String statusDate) {
        if (statusDate == null || statusDate.isBlank()) {
            return Instant.now();
        }
        try {
            return Instant.parse(statusDate);
        } catch (DateTimeParseException e) {
            return Instant.now();
        }
    }
}
