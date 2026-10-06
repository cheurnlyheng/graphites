package com.jess.shop.returns.controller;

import com.jess.shop.returns.dto.ReturnDtos.ApproveReturnRequest;
import com.jess.shop.returns.dto.ReturnDtos.RejectReturnRequest;
import com.jess.shop.returns.dto.ReturnDtos.ResolveReturnRequest;
import com.jess.shop.returns.dto.ReturnDtos.ReturnResponse;
import com.jess.shop.returns.entity.ReturnStatus;
import com.jess.shop.returns.service.ReturnService;
import com.jess.shop.shipping.dto.AdminShippingDtos.BuyLabelRequest;
import com.jess.shop.shipping.dto.AdminShippingDtos.ShippingRatesResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/returns")
public class AdminReturnController {

    private final ReturnService returnService;

    public AdminReturnController(ReturnService returnService) {
        this.returnService = returnService;
    }

    @GetMapping
    public Page<ReturnResponse> list(@RequestParam(required = false) ReturnStatus status, Pageable pageable) {
        return returnService.adminList(status, pageable);
    }

    @PostMapping("/{id}/approve")
    public ReturnResponse approve(@PathVariable UUID id, @Valid @RequestBody ApproveReturnRequest request) {
        return returnService.approve(id, request.shopFault());
    }

    @PostMapping("/{id}/reject")
    public ReturnResponse reject(@PathVariable UUID id, @RequestBody(required = false) RejectReturnRequest request) {
        return returnService.reject(id, request);
    }

    @GetMapping("/{id}/return-rates")
    public ShippingRatesResponse returnRates(@PathVariable UUID id) {
        return returnService.getReturnRates(id);
    }

    @PostMapping("/{id}/return-label")
    public ReturnResponse buyReturnLabel(@PathVariable UUID id, @Valid @RequestBody BuyLabelRequest request) {
        return returnService.buyReturnLabel(id, request);
    }

    @PostMapping("/{id}/received")
    public ReturnResponse markReceived(@PathVariable UUID id) {
        return returnService.markReceived(id);
    }

    @PostMapping("/{id}/resolve")
    public ReturnResponse resolve(@PathVariable UUID id, @Valid @RequestBody ResolveReturnRequest request) {
        return returnService.refund(id, request);
    }
}
