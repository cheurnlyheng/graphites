package com.jess.shop.order.dto;

import com.jess.shop.order.entity.OrderStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class OrderDtos {

    public record OrderItemResponse(UUID id, String productName, String variantAttributes,
                                     BigDecimal unitPrice, int quantity, BigDecimal lineTotal) {}

    public record OrderResponse(UUID id, String email, OrderStatus status, BigDecimal subtotal, BigDecimal taxAmount,
                                 BigDecimal shippingAmount, BigDecimal total, String currency,
                                 Instant createdAt, Instant paidAt, List<OrderItemResponse> items,
                                 Boolean shippingAddressValid, String shippingAddressValidationNote,
                                 String carrier, String trackingNumber, String trackingUrl, Instant shippedAt,
                                 Instant deliveredAt) {}

    public record CheckoutSessionResponse(String checkoutUrl) {}

    /** reason is optional -- an admin cancelling a duplicate/test order may have nothing worth telling the
     * customer, but when given, it's included in the cancellation email verbatim. */
    public record CancelOrderRequest(String reason) {}
}
