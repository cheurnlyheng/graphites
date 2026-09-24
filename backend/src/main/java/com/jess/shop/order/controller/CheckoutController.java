package com.jess.shop.order.controller;

import com.jess.shop.cart.dto.CartDtos.CartResponse;
import com.jess.shop.cart.service.CartService;
import com.jess.shop.order.dto.OrderDtos.CheckoutSessionResponse;
import com.jess.shop.order.entity.Order;
import com.jess.shop.order.service.OrderService;
import com.jess.shop.payment.service.StripeCheckoutService;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** No customer accounts exist -- every checkout is a guest checkout, identified by X-Cart-Token.
 * Stripe's hosted page collects the shipping address and email, and handles payment. */
@RestController
@RequestMapping("/api/checkout")
public class CheckoutController {

    private final CartService cartService;
    private final OrderService orderService;
    private final StripeCheckoutService stripeCheckoutService;

    public CheckoutController(CartService cartService, OrderService orderService, StripeCheckoutService stripeCheckoutService) {
        this.cartService = cartService;
        this.orderService = orderService;
        this.stripeCheckoutService = stripeCheckoutService;
    }

    @PostMapping("/session")
    public CheckoutSessionResponse createSession(@RequestHeader(value = "X-Cart-Token", required = false) String cartToken) {
        CartResponse cart = cartService.getCart(cartToken);
        if (cart.items().isEmpty()) {
            throw new IllegalStateException("Cannot check out an empty cart");
        }

        Order order = orderService.createPendingOrder(cart.cartId(), cart.items());

        try {
            Session session = stripeCheckoutService.createSession(order, cart.items(), null);
            orderService.attachStripeSession(order.getId(), session.getId());
            return new CheckoutSessionResponse(session.getUrl());
        } catch (StripeException e) {
            throw new RuntimeException("Failed to create Stripe Checkout session", e);
        }
    }
}
