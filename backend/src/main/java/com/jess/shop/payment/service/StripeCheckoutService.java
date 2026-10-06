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

    // Stripe's own built-in tax code for shipping charges -- lets automatic tax apply each state's
    // real shipping-taxability rules instead of treating this line item as ordinary merchandise.
    private static final String SHIPPING_TAX_CODE = "txcd_92010001";

    @Value("${app.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    /** Builds a Stripe Checkout Session from the order's line items plus one line item for the real
     * Shippo-quoted delivery method the customer already picked on the checkout page (see
     * CheckoutController) -- Stripe no longer collects the address or offers its own shipping tiers,
     * since both are already known by the time this runs. Embedded ui_mode renders this session's
     * payment form (card fields, automatic tax, wallets) inline on our own /checkout page via
     * Stripe.js's EmbeddedCheckout component instead of redirecting to a Stripe-hosted page -- same
     * Session object and webhook event (checkout.session.completed) either way, just a different
     * delivery mechanism for the UI. */
    public Session createSession(Order order, List<CartItemResponse> items, String customerEmail,
                                  String shippingLabel, BigDecimal shippingAmount) throws StripeException {
        SessionCreateParams.Builder builder = SessionCreateParams.builder()
            .setUiMode(SessionCreateParams.UiMode.EMBEDDED_PAGE)
            .setMode(SessionCreateParams.Mode.PAYMENT)
            .setReturnUrl(frontendBaseUrl + "/order-confirmation?session_id={CHECKOUT_SESSION_ID}")
            .setClientReferenceId(order.getId().toString())
            // Card only for now. Left to the account defaults, Stripe also offers Link, Klarna, Affirm,
            // Cash App and Amazon Pay -- Link in particular asks for an email verification code right
            // after you type your email, which looks exactly like "nothing happens" if you miss it.
            .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
            .setAutomaticTax(SessionCreateParams.AutomaticTax.builder().setEnabled(true).build());

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

        if (shippingLabel != null) {
            BigDecimal amount = shippingAmount == null ? BigDecimal.ZERO : shippingAmount;
            builder.addLineItem(
                SessionCreateParams.LineItem.builder()
                    .setQuantity(1L)
                    .setPriceData(
                        SessionCreateParams.LineItem.PriceData.builder()
                            .setCurrency("usd")
                            .setUnitAmount(amount.multiply(BigDecimal.valueOf(100)).longValue())
                            .setProductData(
                                SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                    .setName("Shipping -- " + shippingLabel)
                                    .setTaxCode(SHIPPING_TAX_CODE)
                                    .build()
                            )
                            .setTaxBehavior(SessionCreateParams.LineItem.PriceData.TaxBehavior.EXCLUSIVE)
                            .build()
                    )
                    .build()
            );
        }

        return Session.create(builder.build());
    }
}
