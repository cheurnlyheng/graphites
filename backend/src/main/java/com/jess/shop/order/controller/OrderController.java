package com.jess.shop.order.controller;

import com.jess.shop.order.dto.OrderDtos.OrderResponse;
import com.jess.shop.order.service.OrderService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    /** Not login-gated: there are no customer accounts -- every order is a guest order. Security
     * relies on the order id being an unguessable UUID (see SecurityConfig). */
    @GetMapping("/{id}")
    public OrderResponse get(@PathVariable UUID id) {
        return orderService.getById(id);
    }

    /** The order-confirmation page lands here straight from Stripe, which only hands back its own
     * Checkout Session id -- not our order id. */
    @GetMapping("/by-session/{sessionId}")
    public OrderResponse getBySession(@PathVariable String sessionId) {
        return orderService.getByStripeSessionId(sessionId);
    }
}
