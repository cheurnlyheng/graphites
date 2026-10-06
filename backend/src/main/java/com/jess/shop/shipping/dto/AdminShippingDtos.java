package com.jess.shop.shipping.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class AdminShippingDtos {

    public record ShippingRateOption(String rateObjectId, String provider, String serviceLevel,
                                      String amount, String currency, Integer estimatedDays) {}

    public record ShippingRatesResponse(List<ShippingRateOption> rates) {}

    // carrier and amount are passed through from the rate the admin picked (e.g. "USPS", "8.42") --
    // Shippo's transaction response has no short carrier code or cost field of its own, only a
    // tracking *URL* and the rate's object_id, which doesn't carry its price along with it.
    public record BuyLabelRequest(@NotBlank String rateObjectId, String carrier, String amount, boolean returnLabel) {}

    public record ShipmentDto(UUID id, UUID orderId, String carrier, String trackingNumber, String labelUrl,
                               String trackingUrl, boolean returnLabel, Instant shippedAt, BigDecimal cost) {}
}
