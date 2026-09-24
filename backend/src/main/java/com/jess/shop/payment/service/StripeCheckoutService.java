package com.jess.shop.payment.service;

import com.jess.shop.cart.dto.CartDtos.CartItemResponse;
import com.jess.shop.order.entity.Order;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class StripeCheckoutService {

    // Stripe requires an explicit allow-list for shipping address collection -- there's no "all
    // countries" wildcard. US-only for launch (deliberate scope, not a placeholder -- see README);
    // add more countries here once the shop is ready to actually fulfill international orders.
    private static final List<SessionCreateParams.ShippingAddressCollection.AllowedCountry> ALLOWED_SHIPPING_COUNTRIES = List.of(
        SessionCreateParams.ShippingAddressCollection.AllowedCountry.US
    );

    @Value("${app.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    /** Builds a Stripe Checkout Session from the order's line items. Stripe's hosted page collects
     * the shipping address and (for guests) the email, and computes tax automatically. */
    public Session createSession(Order order, List<CartItemResponse> items, String customerEmail) throws StripeException {
        SessionCreateParams.Builder builder = SessionCreateParams.builder()
            .setMode(SessionCreateParams.Mode.PAYMENT)
            .setSuccessUrl(frontendBaseUrl + "/order-confirmation?session_id={CHECKOUT_SESSION_ID}")
            .setCancelUrl(frontendBaseUrl + "/cart")
            .setClientReferenceId(order.getId().toString())
            // Card only for now. Left to the account defaults, Stripe also offers Link, Klarna, Affirm,
            // Cash App and Amazon Pay -- Link in particular asks for an email verification code right
            // after you type your email, which looks exactly like "nothing happens" if you miss it.
            .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
            .setAutomaticTax(SessionCreateParams.AutomaticTax.builder().setEnabled(true).build())
            .setShippingAddressCollection(
                SessionCreateParams.ShippingAddressCollection.builder()
                    .addAllAllowedCountry(ALLOWED_SHIPPING_COUNTRIES)
                    .build()
            )
            // Named flat-rate tiers, not live carrier rates -- the customer picks a speed/price tier
            // here; which real carrier (UPS/USPS/etc.) actually ships it is a separate, later decision
            // made in the admin fulfillment queue against real Shippo rates (ShipmentService). Free
            // ground shipping is the norm across most clothing DTC sites, so it's the default tier;
            // Express is the only paid upgrade.
            .addShippingOption(shippingTier("Free Shipping (UPS Ground)", 0L, 5L, 7L))
            .addShippingOption(shippingTier("Express Shipping", 1499L, 2L, 2L));

        if (customerEmail != null && !customerEmail.isBlank()) {
            builder.setCustomerEmail(customerEmail);
        }

        for (CartItemResponse item : items) {
            String name = item.productName() + (item.variantAttributes() != null ? " (" + item.variantAttributes() + ")" : "");
            SessionCreateParams.LineItem.PriceData.ProductData.Builder productDataBuilder =
                SessionCreateParams.LineItem.PriceData.ProductData.builder().setName(name);
            // Falls back to the account's default tax code (Tax Settings -> Defaults) when the
            // product doesn't specify its own -- e.g. "Clothing & Footwear" (txcd_30011000) covers
            // the state clothing-sales-tax exemptions correctly for general apparel by default.
            if (item.taxCode() != null && !item.taxCode().isBlank()) {
                productDataBuilder.setTaxCode(item.taxCode());
            }
            SessionCreateParams.LineItem.PriceData.ProductData productData = productDataBuilder.build();

            builder.addLineItem(
                SessionCreateParams.LineItem.builder()
                    .setQuantity((long) item.quantity())
                    .setPriceData(
                        SessionCreateParams.LineItem.PriceData.builder()
                            .setCurrency("usd")
                            .setUnitAmount(item.unitPrice().multiply(BigDecimal.valueOf(100)).longValue())
                            .setProductData(productData)
                            // Required whenever automatic_tax is enabled -- prices are entered
                            // tax-exclusive (displayed price does not already include tax).
                            .setTaxBehavior(SessionCreateParams.LineItem.PriceData.TaxBehavior.EXCLUSIVE)
                            .build()
                    )
                    .build()
            );
        }

        return Session.create(builder.build());
    }

    private SessionCreateParams.ShippingOption shippingTier(String displayName, long amountCents, long minDays, long maxDays) {
        return SessionCreateParams.ShippingOption.builder()
            .setShippingRateData(
                SessionCreateParams.ShippingOption.ShippingRateData.builder()
                    .setType(SessionCreateParams.ShippingOption.ShippingRateData.Type.FIXED_AMOUNT)
                    .setFixedAmount(
                        SessionCreateParams.ShippingOption.ShippingRateData.FixedAmount.builder()
                            .setAmount(amountCents)
                            .setCurrency("usd")
                            .build()
                    )
                    // Required whenever automatic_tax is enabled -- our prices are entered
                    // tax-exclusive (tax is added on top at checkout), so shipping matches.
                    .setTaxBehavior(SessionCreateParams.ShippingOption.ShippingRateData.TaxBehavior.EXCLUSIVE)
                    .setDisplayName(displayName)
                    .setDeliveryEstimate(
                        SessionCreateParams.ShippingOption.ShippingRateData.DeliveryEstimate.builder()
                            .setMinimum(
                                SessionCreateParams.ShippingOption.ShippingRateData.DeliveryEstimate.Minimum.builder()
                                    .setUnit(SessionCreateParams.ShippingOption.ShippingRateData.DeliveryEstimate.Minimum.Unit.BUSINESS_DAY)
                                    .setValue(minDays)
                                    .build()
                            )
                            .setMaximum(
                                SessionCreateParams.ShippingOption.ShippingRateData.DeliveryEstimate.Maximum.builder()
                                    .setUnit(SessionCreateParams.ShippingOption.ShippingRateData.DeliveryEstimate.Maximum.Unit.BUSINESS_DAY)
                                    .setValue(maxDays)
                                    .build()
                            )
                            .build()
                    )
                    .build()
            )
            .build();
    }
}
