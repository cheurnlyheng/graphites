package com.jess.shop.report.service;

import com.jess.shop.order.entity.Order;
import com.jess.shop.order.entity.OrderItem;
import com.jess.shop.order.entity.OrderStatus;
import com.jess.shop.order.repository.OrderItemRepository;
import com.jess.shop.order.repository.OrderRepository;
import com.jess.shop.report.dto.ReportDtos.DailyRevenue;
import com.jess.shop.report.dto.ReportDtos.ReportSummaryResponse;
import com.jess.shop.report.dto.ReportDtos.TopProduct;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ReportService {

    /** What counts as "earned" for a report: payment went through, whatever happened after. A CANCELLED
     * order is excluded even if it was briefly PAID, since cancelling one refunds it -- see OrderService.cancel. */
    private static final List<OrderStatus> REVENUE_STATUSES = List.of(OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED);
    private static final int TOP_PRODUCTS_LIMIT = 10;

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;

    public ReportService(OrderRepository orderRepository, OrderItemRepository orderItemRepository) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
    }

    public ReportSummaryResponse summary(Instant from, Instant to) {
        List<Order> orders = orderRepository.findRevenueOrdersBetween(REVENUE_STATUSES, from, to);

        BigDecimal totalRevenue = orders.stream().map(Order::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        long orderCount = orders.size();
        BigDecimal averageOrderValue = orderCount == 0
            ? BigDecimal.ZERO
            : totalRevenue.divide(BigDecimal.valueOf(orderCount), 2, RoundingMode.HALF_UP);

        List<DailyRevenue> revenueByDay = orders.stream()
            .collect(Collectors.groupingBy(o -> LocalDate.ofInstant(o.getPaidAt(), ZoneOffset.UTC)))
            .entrySet().stream()
            .map(e -> new DailyRevenue(e.getKey(),
                e.getValue().stream().map(Order::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add),
                e.getValue().size()))
            .sorted(Comparator.comparing(DailyRevenue::date))
            .toList();

        List<UUID> orderIds = orders.stream().map(Order::getId).toList();
        List<OrderItem> items = orderIds.isEmpty() ? List.of() : orderItemRepository.findByOrderIdIn(orderIds);
        List<TopProduct> topProducts = items.stream()
            .collect(Collectors.groupingBy(OrderItem::getProductNameSnapshot))
            .entrySet().stream()
            .map(e -> new TopProduct(e.getKey(),
                e.getValue().stream().mapToLong(OrderItem::getQuantity).sum(),
                e.getValue().stream().map(OrderItem::getLineTotal).reduce(BigDecimal.ZERO, BigDecimal::add)))
            .sorted(Comparator.comparing(TopProduct::revenue).reversed())
            .limit(TOP_PRODUCTS_LIMIT)
            .toList();

        return new ReportSummaryResponse(totalRevenue, orderCount, averageOrderValue, revenueByDay, topProducts);
    }
}
