package com.jess.shop.shipping.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** The shipping address the customer enters at checkout, before Stripe is ever involved -- needed
 * to quote real Shippo rates up front (see ShipmentService.getRatesForAddress). US-only for launch,
 * same deliberate scope as the rest of fulfillment -- see StripeCheckoutService/README. */
public class CheckoutShippingDtos {

    public record ShippingAddressRequest(@NotBlank String fullName, @NotBlank String line1, String line2,
                                          @NotBlank String city, @NotBlank String state, @NotBlank String postalCode,
                                          @NotBlank String country, String phone, @Email String email) {}
}
