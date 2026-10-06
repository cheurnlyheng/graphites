package com.jess.shop.report.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class ReportDtos {

    public record ReportSummaryResponse(BigDecimal totalRevenue, long orderCount, BigDecimal averageOrderValue,
                                         BigDecimal labelCost, BigDecimal estimatedStripeFees, BigDecimal netProfit,
                                         List<DailyRevenue> revenueByDay, List<TopProduct> topProducts) {}

    public record DailyRevenue(LocalDate date, BigDecimal revenue, long orderCount) {}

    public record TopProduct(String productName, long quantitySold, BigDecimal revenue) {}
}
