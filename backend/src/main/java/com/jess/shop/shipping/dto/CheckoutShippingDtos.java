package com.jess.shop.shipping.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** The shipping address the customer enters at checkout, before Stripe is ever involved -- needed
 * to quote real Shippo rates up front (see ShipmentService.getRatesForAddress). US-only for launch,
 * same deliberate scope as the rest of fulfillment -- see StripeCheckoutService/README. */
public class CheckoutShippingDtos {

    // Required, not just format-checked if present: Shippo rejects a label purchase outright
    // without a valid phone ("address_to.phone should contain a valid phone number") -- found the
    // hard way when an admin tried to buy a label for an order with no usable phone number on file.
    // Frontend validates the same shape before this ever reaches the backend, but that can be
    // bypassed, and this is the call that actually talks to Shippo.
    private static final String US_PHONE_PATTERN = "^\\+?1?[-.\\s]?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}$";

    public record ShippingAddressRequest(@NotBlank String fullName, @NotBlank String line1, String line2,
                                          @NotBlank String city, @NotBlank String state, @NotBlank String postalCode,
                                          @NotBlank String country,
                                          @NotBlank @Pattern(regexp = US_PHONE_PATTERN, message = "must be a valid US phone number") String phone,
                                          @NotBlank @Email String email) {}
}
