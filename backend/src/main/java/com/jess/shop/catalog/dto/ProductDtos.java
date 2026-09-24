package com.jess.shop.catalog.dto;

import com.jess.shop.catalog.entity.ProductStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public class ProductDtos {

    public record VariantResponse(UUID id, String sku, String size, String color, int stockQty, boolean inStock) {}

    public record ImageResponse(UUID id, String colorGroup, String url, int sortOrder) {}

    public record ProductSummaryResponse(UUID id, String name, String slug, BigDecimal price, String thumbnailUrl, boolean inStock) {}

    public record ProductDetailResponse(
        UUID id, String name, String slug, String description, UUID categoryId, ProductStatus status, String taxCode,
        BigDecimal price, List<VariantResponse> variants, List<ImageResponse> images
    ) {}

    // No price here -- every variant of a product shares the one price set on the product itself.
    public record VariantRequest(
        String sku, String size, String color,
        @PositiveOrZero Integer stockQty,
        @PositiveOrZero Integer lowStockThreshold
    ) {}

    public record UpdateVariantRequest(@PositiveOrZero Integer stockQty, @PositiveOrZero Integer lowStockThreshold) {}

    public record ImageRequest(String colorGroup, @NotBlank String url, Integer sortOrder) {}

    public record CreateProductRequest(
        @NotBlank String name,
        @NotBlank String slug,
        String description,
        UUID categoryId,
        String taxCode,
        Integer weightGrams,
        @NotNull @Positive BigDecimal price,
        List<VariantRequest> variants,
        List<ImageRequest> images
    ) {}

    public record UpdateProductRequest(
        @NotBlank String name,
        String description,
        UUID categoryId,
        ProductStatus status,
        String taxCode,
        Integer weightGrams,
        @NotNull @Positive BigDecimal price
    ) {}
}
