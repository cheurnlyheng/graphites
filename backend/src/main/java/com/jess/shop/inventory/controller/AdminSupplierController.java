package com.jess.shop.inventory.controller;

import com.jess.shop.inventory.dto.InventoryDtos.*;
import com.jess.shop.inventory.service.SupplierService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/suppliers")
public class AdminSupplierController {

    private final SupplierService supplierService;

    public AdminSupplierController(SupplierService supplierService) {
        this.supplierService = supplierService;
    }

    @GetMapping
    public List<SupplierResponse> list() {
        return supplierService.listAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SupplierResponse create(@Valid @RequestBody CreateSupplierRequest request) {
        return supplierService.create(request);
    }

    @PostMapping("/variants/{variantId}/link")
    public void linkVariant(@PathVariable UUID variantId, @Valid @RequestBody LinkSupplierRequest request) {
        supplierService.linkToVariant(variantId, request);
    }
}
