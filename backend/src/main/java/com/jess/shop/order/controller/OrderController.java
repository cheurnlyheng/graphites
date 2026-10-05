package com.jess.shop.order.controller;

import com.jess.shop.order.dto.OrderDtos.CancelOrderRequest;
import com.jess.shop.order.dto.OrderDtos.OrderResponse;
import com.jess.shop.order.service.OrderService;
import com.jess.shop.payment.service.StripePaymentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;
    private final StripePaymentService stripePaymentService;

    public OrderController(OrderService orderService, StripePaymentService stripePaymentService) {
        this.orderService = orderService;
        this.stripePaymentService = stripePaymentService;
    }

    /** Not login-gated: there are no customer accounts -- every order is a guest order. Security
     * relies on the order id being an unguessable UUID (see SecurityConfig). */
    @GetMapping("/{id}")
    public OrderResponse get(@PathVariable UUID id) {
        return orderService.getById(id);
    }

    /** The order-confirmation page lands here straight from Stripe, which only hands back its own
     * Checkout Session id -- not our order id. While the order is still PENDING this asks Stripe whether it was
     * paid, so the page shows PAID right away instead of waiting on (or depending on) the webhook. */
    @GetMapping("/by-session/{sessionId}")
    public OrderResponse getBySession(@PathVariable String sessionId) {
        stripePaymentService.syncIfPending(sessionId);
        return orderService.getByStripeSessionId(sessionId);
    }

    /** Self-service cancellation for a guest who hasn't received their order yet. Same security model
     * as every other endpoint here (the unguessable order id is the only credential), and the same
     * trust boundary a customer already has just by holding this link -- they can already see the full
     * order, so letting them cancel it isn't a bigger grant. OrderService.cancel already refuses
     * anything past PAID (can't cancel something already shipped -- that's a return's job instead,
     * see ReturnController, which only accepts DELIVERED orders). */
    @PostMapping("/{id}/cancel")
    public OrderResponse cancel(@PathVariable UUID id, @RequestBody(required = false) CancelOrderRequest request) {
        String reason = request != null ? request.reason() : null;
        return orderService.cancel(id, reason);
    }
}
