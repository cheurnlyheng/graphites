package com.jess.shop.returns.controller;

import com.jess.shop.returns.dto.ReturnDtos.ReturnResponse;
import com.jess.shop.returns.dto.ReturnDtos.ResolveReturnRequest;
import com.jess.shop.returns.entity.ReturnStatus;
import com.jess.shop.returns.service.ReturnService;
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
    public ReturnResponse approve(@PathVariable UUID id) {
        return returnService.approve(id);
    }

    @PostMapping("/{id}/reject")
    public ReturnResponse reject(@PathVariable UUID id) {
        return returnService.reject(id);
    }

    @PostMapping("/{id}/resolve")
    public ReturnResponse resolve(@PathVariable UUID id, @Valid @RequestBody ResolveReturnRequest request) {
        return returnService.markReceivedAndRefund(id, request);
    }
}
