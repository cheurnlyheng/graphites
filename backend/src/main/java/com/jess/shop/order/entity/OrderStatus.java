package com.jess.shop.order.entity;

/** FULFILLED was dropped: buying a shipping label already flips SHIPPED, so a separate manual
 * "fulfilled" step never meant anything. REFUNDED was dropped too -- a pre-shipment refund is a
 * CANCELLED order, and a post-shipment refund is tracked on the return_request it belongs to
 * (see ReturnStatus.REFUNDED), so this enum doesn't need to duplicate that state. */
public enum OrderStatus {
    PENDING,
    PAID,
    SHIPPED,
    /** Set automatically off Shippo's track_updated webhook once the carrier reports delivery --
     * see ShippoWebhookService. Never set by hand. */
    DELIVERED,
    CANCELLED
}
