package com.jess.shop.order.controller;

import com.jess.shop.cart.dto.CartDtos.CartResponse;
import com.jess.shop.cart.service.CartService;
import com.jess.shop.order.dto.OrderDtos.CheckoutSessionRequest;
import com.jess.shop.order.dto.OrderDtos.CheckoutSessionResponse;
import com.jess.shop.order.entity.Order;
import com.jess.shop.order.service.OrderService;
import com.jess.shop.payment.service.StripeCheckoutService;
import com.jess.shop.shipping.dto.AdminShippingDtos.ShippingRatesResponse;
import com.jess.shop.shipping.dto.CheckoutShippingDtos.ShippingAddressRequest;
import com.jess.shop.shipping.service.ShipmentService;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** No customer accounts exist -- every checkout is a guest checkout, identified by X-Cart-Token.
 * The checkout page itself now collects the shipping address and a real Shippo-quoted delivery
 * method before Stripe is ever involved (see /shipping-rates below); Stripe's hosted page is left
 * to handle only payment and email. US-only for launch -- same deliberate scope noted on
 * StripeCheckoutService historically, enforced here since address collection moved to this side. */
@RestController
@RequestMapping("/api/checkout")
public class CheckoutController {

    private final CartService cartService;
    private final OrderService orderService;
    private final StripeCheckoutService stripeCheckoutService;
    private final ShipmentService shipmentService;

    public CheckoutController(CartService cartService, OrderService orderService,
                               StripeCheckoutService stripeCheckoutService, ShipmentService shipmentService) {
        this.cartService = cartService;
        this.orderService = orderService;
        this.stripeCheckoutService = stripeCheckoutService;
        this.shipmentService = shipmentService;
    }

    /** Called once the customer has filled in their address, before any order exists yet -- lets
     * them pick a real delivery method (and its real price) instead of a flat-rate guess. */
    @PostMapping("/shipping-rates")
    public ShippingRatesResponse getShippingRates(@RequestHeader(value = "X-Cart-Token", required = false) String cartToken,
                                                   @Valid @RequestBody ShippingAddressRequest address) {
        requireUsAddress(address);
        CartResponse cart = cartService.getCart(cartToken);
        if (cart.items().isEmpty()) {
            throw new IllegalStateException("Cannot quote shipping for an empty cart");
        }
        return shipmentService.getRatesForAddress(cart.items(), address);
    }

    @PostMapping("/session")
    public CheckoutSessionResponse createSession(@RequestHeader(value = "X-Cart-Token", required = false) String cartToken,
                                                  @Valid @RequestBody CheckoutSessionRequest request) {
        requireUsAddress(request.shippingAddress());
        CartResponse cart = cartService.getCart(cartToken);
        if (cart.items().isEmpty()) {
            throw new IllegalStateException("Cannot check out an empty cart");
        }

        Order order = orderService.createPendingOrder(cart.cartId(), cart.items(), request.shippingAddress(),
            request.carrier(), request.serviceLevel(), request.shippingAmount());

        try {
            String shippingLabel = request.serviceLevel() != null
                ? request.carrier() + " " + request.serviceLevel()
                : request.carrier();
            Session session = stripeCheckoutService.createSession(order, cart.items(), request.shippingAddress().email(),
                shippingLabel, request.shippingAmount());
            orderService.attachStripeSession(order.getId(), session.getId());
            return new CheckoutSessionResponse(session.getUrl());
        } catch (StripeException e) {
            throw new RuntimeException("Failed to create Stripe Checkout session", e);
        }
    }

    // Deliberate launch scope (see StripeCheckoutService historically) -- the warehouse only fulfills
    // domestically today, so a non-US address would quote real Shippo rates that can never actually
    // ship. Checked here now that this side collects the address, instead of Stripe's allow-list.
    private void requireUsAddress(ShippingAddressRequest address) {
        if (!"US".equalsIgnoreCase(address.country())) {
            throw new IllegalStateException("We currently only ship within the United States");
        }
    }
}
