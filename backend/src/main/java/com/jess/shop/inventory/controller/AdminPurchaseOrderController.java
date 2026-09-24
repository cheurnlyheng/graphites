package com.jess.shop.inventory.controller;

import com.jess.shop.inventory.dto.InventoryDtos.*;
import com.jess.shop.inventory.service.RestockService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/purchase-orders")
public class AdminPurchaseOrderController {

    private final RestockService restockService;

    public AdminPurchaseOrderController(RestockService restockService) {
        this.restockService = restockService;
    }

    @GetMapping("/low-stock")
    public List<LowStockVariant> lowStock() {
        return restockService.listLowStock();
    }

    @GetMapping
    public List<PurchaseOrderResponse> listDrafts() {
        return restockService.listDraftPurchaseOrders();
    }

    @PostMapping("/{id}/mark-sent")
    public PurchaseOrderResponse markSent(@PathVariable UUID id) {
        return restockService.markSent(id);
    }

    @PostMapping("/generate-now")
    public void generateNow() {
        restockService.generateDraftPurchaseOrders();
    }
}
