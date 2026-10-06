package com.jess.shop.report.service;

import com.jess.shop.order.entity.Order;
import com.jess.shop.order.entity.OrderItem;
import com.jess.shop.order.entity.OrderStatus;
import com.jess.shop.order.repository.OrderItemRepository;
import com.jess.shop.order.repository.OrderRepository;
import com.jess.shop.report.dto.ReportDtos.DailyRevenue;
import com.jess.shop.report.dto.ReportDtos.ReportSummaryResponse;
import com.jess.shop.report.dto.ReportDtos.TopProduct;
import com.jess.shop.shipping.entity.Shipment;
import com.jess.shop.shipping.repository.ShipmentRepository;
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
    private static final List<OrderStatus> REVENUE_STATUSES =
        List.of(OrderStatus.PAID, OrderStatus.LABEL_PURCHASED, OrderStatus.SHIPPED, OrderStatus.DELIVERED);
    private static final int TOP_PRODUCTS_LIMIT = 10;

    // Stripe's standard published US online rate (2.9% + $0.30 per successful charge). This project
    // never captures the real per-charge fee from Stripe's balance transaction (that needs an extra
    // API call per charge, or capturing it off the webhook at payment time), so this is a clearly-
    // labeled estimate rather than the real number -- close enough to budget against, not exact.
    private static final BigDecimal STRIPE_PERCENT_FEE = new BigDecimal("0.029");
    private static final BigDecimal STRIPE_FIXED_FEE = new BigDecimal("0.30");

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ShipmentRepository shipmentRepository;

    public ReportService(OrderRepository orderRepository, OrderItemRepository orderItemRepository,
                          ShipmentRepository shipmentRepository) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.shipmentRepository = shipmentRepository;
    }

    public ReportSummaryResponse summary(Instant from, Instant to) {
        List<Order> orders = orderRepository.findRevenueOrdersBetween(REVENUE_STATUSES, from, to);

        BigDecimal totalRevenue = orders.stream().map(Order::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        long orderCount = orders.size();
        BigDecimal averageOrderValue = orderCount == 0
            ? BigDecimal.ZERO
            : totalRevenue.divide(BigDecimal.valueOf(orderCount), 2, RoundingMode.HALF_UP);

        List<UUID> orderIds = orders.stream().map(Order::getId).toList();

        // Return labels are a cost of doing returns, not of making the sale -- excluded here so this
        // stays "what did it cost to ship what we sold", matching how totalRevenue is scoped above.
        BigDecimal labelCost = orderIds.isEmpty() ? BigDecimal.ZERO : shipmentRepository.findByOrderIdIn(orderIds).stream()
            .filter(s -> !s.isReturnLabel() && s.getCost() != null)
            .map(Shipment::getCost)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal estimatedStripeFees = orders.stream()
            .map(o -> o.getTotal().multiply(STRIPE_PERCENT_FEE).add(STRIPE_FIXED_FEE))
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);

        BigDecimal netProfit = totalRevenue.subtract(labelCost).subtract(estimatedStripeFees);

        List<DailyRevenue> revenueByDay = orders.stream()
            .collect(Collectors.groupingBy(o -> LocalDate.ofInstant(o.getPaidAt(), ZoneOffset.UTC)))
            .entrySet().stream()
            .map(e -> new DailyRevenue(e.getKey(),
                e.getValue().stream().map(Order::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add),
                e.getValue().size()))
            .sorted(Comparator.comparing(DailyRevenue::date))
            .toList();

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

        return new ReportSummaryResponse(totalRevenue, orderCount, averageOrderValue, labelCost,
            estimatedStripeFees, netProfit, revenueByDay, topProducts);
    }
}
