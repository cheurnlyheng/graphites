package com.jess.shop.shipping.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class AdminShippingDtos {

    public record ShippingRateOption(String rateObjectId, String provider, String serviceLevel,
                                      String amount, String currency, Integer estimatedDays) {}

    public record ShippingRatesResponse(List<ShippingRateOption> rates) {}

    // carrier is passed through from the rate the admin picked (e.g. "USPS") -- Shippo's
    // transaction response has no short carrier code of its own, only a tracking *URL*.
    public record BuyLabelRequest(@NotBlank String rateObjectId, String carrier, boolean returnLabel) {}

    public record ShipmentDto(UUID id, UUID orderId, String carrier, String trackingNumber, String labelUrl,
                               String trackingUrl, boolean returnLabel, Instant shippedAt) {}
}
