package com.jess.shop.report.controller;

import com.jess.shop.report.dto.ReportDtos.ReportSummaryResponse;
import com.jess.shop.report.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

/** Guarded by SecurityConfig's /api/admin/** ROLE_ADMIN rule, like the rest of the admin API. */
@RestController
@RequestMapping("/api/admin/reports")
public class AdminReportController {

    private final ReportService reportService;

    public AdminReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    /** from/to are calendar dates in the shop's own timezone-free sense (UTC) -- to is inclusive, covering
     * the whole day. E.g. from=2026-01-01&to=2026-01-31 covers all of January. */
    @GetMapping("/summary")
    public ReportSummaryResponse summary(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                          @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        Instant fromInstant = from.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant toInstant = to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        return reportService.summary(fromInstant, toInstant);
    }
}
