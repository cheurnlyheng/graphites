package com.jess.shop.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class InventoryDtos {

    public record SupplierResponse(UUID id, String name, String contactEmail, String phone, String notes) {}

    public record CreateSupplierRequest(@NotBlank String name, String contactEmail, String phone, String notes) {}

    public record LinkSupplierRequest(@NotNull UUID supplierId, BigDecimal costPrice, @PositiveOrZero Integer reorderQty) {}

    public record LowStockVariant(UUID variantId, String sku, String productName, int stockQty, int lowStockThreshold) {}

    public record PurchaseOrderItemResponse(UUID id, UUID productVariantId, String sku, int quantity, BigDecimal unitCost) {}

    public record PurchaseOrderResponse(UUID id, UUID supplierId, String supplierName, String status,
                                         Instant createdAt, List<PurchaseOrderItemResponse> items) {}
}
