package com.jess.shop.order.entity;

/** REFUNDED was dropped: a pre-shipment refund is a CANCELLED order, and a post-shipment refund is
 * tracked on the return_request it belongs to (see ReturnStatus.REFUNDED), so this enum doesn't
 * need to duplicate that state. */
public enum OrderStatus {
    PENDING,
    PAID,
    /** Set the instant a (non-return) label is bought -- see ShipmentService.buyLabel. Just means
     * packing has started; the carrier doesn't have the package yet and the customer hasn't been
     * told anything shipped. */
    LABEL_PURCHASED,
    /** Set by hand once the package is actually handed to the carrier -- see
     * ShipmentService.markShipped. This, not buying the label, is what sends the customer their
     * shipping-confirmation email. */
    SHIPPED,
    /** Set automatically off Shippo's track_updated webhook once the carrier reports delivery --
     * see ShippoWebhookService. Never set by hand. */
    DELIVERED,
    CANCELLED
}
