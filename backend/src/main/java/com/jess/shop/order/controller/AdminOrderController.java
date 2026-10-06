package com.jess.shop.order.controller;

import com.jess.shop.order.dto.OrderDtos.CancelOrderRequest;
import com.jess.shop.order.dto.OrderDtos.OrderResponse;
import com.jess.shop.order.entity.OrderStatus;
import com.jess.shop.order.service.OrderService;
import com.jess.shop.payment.service.StripePaymentService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** The fulfillment queue: defaults to PENDING/PAID orders needing action when no status filter is given. */
@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

    private final OrderService orderService;
    private final StripePaymentService stripePaymentService;

    public AdminOrderController(OrderService orderService, StripePaymentService stripePaymentService) {
        this.orderService = orderService;
        this.stripePaymentService = stripePaymentService;
    }

    @GetMapping
    public Page<OrderResponse> list(@RequestParam(required = false) OrderStatus status, Pageable pageable) {
        return orderService.adminListByStatus(status, pageable);
    }

    @GetMapping("/{id}")
    public OrderResponse get(@PathVariable UUID id) {
        return orderService.getById(id);
    }

    /** Cancels an order that hasn't shipped yet: refunds the Stripe payment in full and restocks the
     * items. There's no generic "set any status" endpoint -- every other transition is either a side
     * effect of a real event (PAID off the Stripe webhook, DELIVERED off Shippo's tracking webhook) or
     * its own narrow, explicit action (LABEL_PURCHASED/SHIPPED -- see AdminShipmentController), and
     * refunds after shipment go through the returns flow instead. Cancellation is the only status
     * change this controller exposes directly. */
    @PostMapping("/{id}/cancel")
    public OrderResponse cancel(@PathVariable UUID id, @RequestBody(required = false) CancelOrderRequest request) {
        String reason = request != null ? request.reason() : null;
        return orderService.cancel(id, reason);
    }

    /** Recovery for an order that is still PENDING here but was actually paid at Stripe (the webhook was lost and the
     * customer never landed back on the confirmation page). Asks Stripe -- it never marks anything paid on its own
     * say-so -- so an order that really wasn't paid simply stays PENDING. */
    @PostMapping("/{id}/sync-payment")
    public OrderResponse syncPayment(@PathVariable UUID id) {
        stripePaymentService.syncOrderIfPending(id);
        return orderService.getById(id);
    }
}
