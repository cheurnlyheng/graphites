package com.jess.shop.shipping.service;

import com.jess.shop.notification.service.EmailService;
import com.jess.shop.order.entity.Order;
import com.jess.shop.order.entity.OrderStatus;
import com.jess.shop.order.repository.OrderRepository;
import com.jess.shop.shipping.dto.ShippoDtos.TrackingWebhookPayload;
import com.jess.shop.shipping.dto.ShippoDtos.TrackingWebhookPayload.TrackingData;
import com.jess.shop.shipping.dto.ShippoDtos.TrackingWebhookPayload.TrackingStatus;
import com.jess.shop.shipping.entity.Shipment;
import com.jess.shop.shipping.repository.ShipmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Covers the branching in ShippoWebhookService.handle -- the only place this shop ever
 * auto-advances an order to DELIVERED, so getting these conditions wrong either strands orders in
 * SHIPPED forever or (worse) flips something that shouldn't move. */
@ExtendWith(MockitoExtension.class)
class ShippoWebhookServiceTest {

    @Mock private ShipmentRepository shipmentRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private EmailService emailService;

    private ShippoWebhookService service;

    @BeforeEach
    void setUp() {
        service = new ShippoWebhookService(shipmentRepository, orderRepository, emailService);
        ReflectionTestUtils.setField(service, "webhookToken", "correct-token");
    }

    private TrackingWebhookPayload payload(String status, String trackingNumber) {
        return new TrackingWebhookPayload("track_updated", new TrackingData(trackingNumber, new TrackingStatus(status, "2026-01-01T00:00:00Z")));
    }

    @Test
    void rejectsWrongWebhookToken() {
        assertThrows(IllegalArgumentException.class,
            () -> service.handle("wrong-token", payload("DELIVERED", "1Z999")));
        verifyNoInteractions(shipmentRepository, orderRepository);
    }

    @Test
    void acceptsRequestWhenNoTokenIsConfigured() {
        ReflectionTestUtils.setField(service, "webhookToken", "");
        when(shipmentRepository.findAllByTrackingNumber("1Z999")).thenReturn(List.of());

        service.handle("anything-or-nothing", payload("DELIVERED", "1Z999"));

        verify(shipmentRepository).findAllByTrackingNumber("1Z999");
    }

    @Test
    void ignoresStatusesThisShopDoesNotModel() {
        service.handle("correct-token", payload("PRE_TRANSIT", "1Z999"));

        verifyNoInteractions(shipmentRepository, orderRepository, emailService);
    }

    @Test
    void ignoresUnknownTrackingNumbers() {
        when(shipmentRepository.findAllByTrackingNumber("UNKNOWN")).thenReturn(List.of());

        service.handle("correct-token", payload("DELIVERED", "UNKNOWN"));

        verify(shipmentRepository, never()).save(any());
        verifyNoInteractions(orderRepository);
    }

    @Test
    void ignoresReturnLabelShipments() {
        Shipment returnShipment = Shipment.builder().orderId(UUID.randomUUID()).trackingNumber("1Z999").returnLabel(true).build();
        when(shipmentRepository.findAllByTrackingNumber("1Z999")).thenReturn(List.of(returnShipment));

        service.handle("correct-token", payload("DELIVERED", "1Z999"));

        verify(shipmentRepository, never()).save(any());
        verifyNoInteractions(orderRepository);
    }

    @Test
    void ignoresDuplicateDeliveryEventsForAnAlreadyDeliveredShipment() {
        Shipment alreadyDelivered = Shipment.builder().orderId(UUID.randomUUID()).trackingNumber("1Z999")
            .deliveredAt(java.time.Instant.parse("2025-12-31T00:00:00Z")).build();
        when(shipmentRepository.findAllByTrackingNumber("1Z999")).thenReturn(List.of(alreadyDelivered));

        service.handle("correct-token", payload("DELIVERED", "1Z999"));

        verify(shipmentRepository, never()).save(any());
        verifyNoInteractions(orderRepository);
    }

    /** Regression test for a real production crash: Shippo's own sandbox/test carriers (e.g. UPS test
     * labels) hand out the exact same placeholder tracking number for every test label bought, so two
     * unrelated shipments legitimately share a tracking number once more than one test label exists.
     * The old Optional-based lookup threw IncorrectResultSizeDataAccessException the moment that
     * happened; this must degrade to a skipped, logged no-op instead, never a 500. */
    @Test
    void doesNotCrashAndSkipsWhenTrackingNumberMatchesMultipleShipments() {
        Shipment first = Shipment.builder().orderId(UUID.randomUUID()).trackingNumber("1ZXXXXXXXXXXXXXXXX").build();
        Shipment second = Shipment.builder().orderId(UUID.randomUUID()).trackingNumber("1ZXXXXXXXXXXXXXXXX").build();
        when(shipmentRepository.findAllByTrackingNumber("1ZXXXXXXXXXXXXXXXX")).thenReturn(List.of(first, second));

        service.handle("correct-token", payload("DELIVERED", "1ZXXXXXXXXXXXXXXXX"));

        verify(shipmentRepository, never()).save(any());
        verifyNoInteractions(orderRepository);
    }

    @Test
    void flipsOrderFromShippedToDeliveredOnFirstDeliveryEvent() {
        UUID orderId = UUID.randomUUID();
        Shipment shipment = Shipment.builder().orderId(orderId).trackingNumber("1Z999").build();
        Order order = Order.builder().id(orderId).email("buyer@example.com").status(OrderStatus.SHIPPED).build();
        when(shipmentRepository.findAllByTrackingNumber("1Z999")).thenReturn(List.of(shipment));
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        service.handle("correct-token", payload("DELIVERED", "1Z999"));

        assertThat(shipment.getDeliveredAt()).isNotNull();
        verify(shipmentRepository).save(shipment);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.DELIVERED);
        verify(orderRepository).save(order);
        verify(emailService).sendDeliveryConfirmation("buyer@example.com", orderId);
    }

    @Test
    void recordsFirstTransitScanAndEmailsCustomerWithoutTouchingOrderStatus() {
        UUID orderId = UUID.randomUUID();
        Shipment shipment = Shipment.builder().orderId(orderId).trackingNumber("1Z999").carrier("UPS").trackingUrl("https://track.example/1Z999").build();
        Order order = Order.builder().id(orderId).email("buyer@example.com").status(OrderStatus.SHIPPED).build();
        when(shipmentRepository.findAllByTrackingNumber("1Z999")).thenReturn(List.of(shipment));
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        service.handle("correct-token", payload("TRANSIT", "1Z999"));

        assertThat(shipment.getInTransitAt()).isNotNull();
        verify(shipmentRepository).save(shipment);
        verify(orderRepository, never()).save(any());
        verify(emailService).sendInTransitUpdate("buyer@example.com", orderId, "UPS", "https://track.example/1Z999");
    }

    @Test
    void ignoresRepeatTransitScansForAShipmentAlreadyMarkedInTransit() {
        Shipment shipment = Shipment.builder().orderId(UUID.randomUUID()).trackingNumber("1Z999")
            .inTransitAt(java.time.Instant.parse("2025-12-30T00:00:00Z")).build();
        when(shipmentRepository.findAllByTrackingNumber("1Z999")).thenReturn(List.of(shipment));

        service.handle("correct-token", payload("TRANSIT", "1Z999"));

        verify(shipmentRepository, never()).save(any());
        verifyNoInteractions(orderRepository, emailService);
    }

    @Test
    void marksShipmentDeliveredButLeavesNonShippedOrderStatusAlone() {
        UUID orderId = UUID.randomUUID();
        Shipment shipment = Shipment.builder().orderId(orderId).trackingNumber("1Z999").build();
        Order cancelledOrder = Order.builder().id(orderId).status(OrderStatus.CANCELLED).build();
        when(shipmentRepository.findAllByTrackingNumber("1Z999")).thenReturn(List.of(shipment));
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(cancelledOrder));

        service.handle("correct-token", payload("DELIVERED", "1Z999"));

        assertThat(shipment.getDeliveredAt()).isNotNull();
        assertThat(cancelledOrder.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        verify(orderRepository, never()).save(any());
    }
}
