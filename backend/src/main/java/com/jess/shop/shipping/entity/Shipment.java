package com.jess.shop.shipping.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "shipment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shipment {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    /** Only set when this is a return label (see ReturnService.buyReturnLabel) -- ties it to the
     * specific return request it was bought for, since an order can have more than one over its life. */
    @Column(name = "return_request_id")
    private UUID returnRequestId;

    private String carrier;

    @Column(name = "tracking_number")
    private String trackingNumber;

    @Column(name = "shippo_transaction_id")
    private String shippoTransactionId;

    @Column(name = "label_url", length = 500)
    private String labelUrl;

    /** What was paid Shippo for this label -- from the rate the admin picked, since Shippo's
     * transaction response itself has no cost field. Null for labels bought before this existed. */
    private BigDecimal cost;

    @Column(name = "tracking_url", length = 500)
    private String trackingUrl;

    @Column(name = "is_return_label", nullable = false)
    @Builder.Default
    private boolean returnLabel = false;

    @Column(name = "shipped_at")
    private Instant shippedAt;

    @Column(name = "estimated_delivery")
    private Instant estimatedDelivery;

    /** First TRANSIT scan Shippo's tracking webhook reports for this shipment -- see
     * ShippoWebhookService. Distinct from shippedAt (which just means an admin bought the label and
     * marked it shipped): this is the carrier actually confirming the package is moving. */
    @Column(name = "in_transit_at")
    private Instant inTransitAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
