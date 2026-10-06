package com.jess.shop.shipping.repository;

import com.jess.shop.shipping.entity.Shipment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShipmentRepository extends JpaRepository<Shipment, UUID> {
    List<Shipment> findByOrderId(UUID orderId);

    /** Used by reports to total up label spend across a batch of orders in one query. */
    List<Shipment> findByOrderIdIn(List<UUID> orderIds);

    /** The outbound shipment (not a return label) shown to the customer on their order tracking page. */
    Optional<Shipment> findFirstByOrderIdAndReturnLabelFalseOrderByShippedAtDesc(UUID orderId);

    /** Looks up the shipment(s) a Shippo tracking webhook is about, by the carrier tracking number.
     * A List, not an Optional -- real carriers issue unique tracking numbers, but Shippo's own
     * sandbox/test carriers hand out the same fixed placeholder (e.g. "1ZXXXXXXXXXXXXXXXX" for a UPS
     * test label) for every test label bought, so more than one shipment can share a tracking number
     * in test mode. See ShippoWebhookService.handle, which has to tolerate that without crashing. */
    List<Shipment> findAllByTrackingNumber(String trackingNumber);

    /** The return label bought for a given return request, if any -- see ReturnService.refund (to
     * deduct its cost for a customer-fault return) and ReturnService.toResponse (to show it to the
     * admin/customer). Ordered by createdAt in case a label was ever re-bought after being lost. */
    Optional<Shipment> findFirstByReturnRequestIdOrderByCreatedAtDesc(UUID returnRequestId);
}
