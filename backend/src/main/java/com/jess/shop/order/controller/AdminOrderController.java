package com.jess.shop.order.controller;

import com.jess.shop.order.dto.OrderDtos.OrderResponse;
import com.jess.shop.order.entity.OrderStatus;
import com.jess.shop.order.service.OrderService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** The fulfillment queue: defaults to PENDING/PAID orders needing action when no status filter is given. */
@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

    private final OrderService orderService;

    public AdminOrderController(OrderService orderService) {
        this.orderService = orderService;
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
     * items. There's no generic "set any status" endpoint anymore -- PAID and SHIPPED only ever happen
     * as side effects of a real event (the Stripe webhook, buying a shipping label), and refunds after
     * shipment go through the returns flow instead, so cancellation is the only status change an admin
     * should be triggering directly. */
    @PostMapping("/{id}/cancel")
    public OrderResponse cancel(@PathVariable UUID id) {
        return orderService.cancel(id);
    }
}
