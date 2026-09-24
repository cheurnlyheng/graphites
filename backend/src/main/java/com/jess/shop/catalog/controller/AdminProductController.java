package com.jess.shop.catalog.controller;

import com.jess.shop.catalog.dto.ProductDtos.*;
import com.jess.shop.catalog.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Admin CRUD for the product catalog -- guarded by SecurityConfig's /api/admin/** ROLE_ADMIN rule. */
@RestController
@RequestMapping("/api/admin/products")
public class AdminProductController {

    private final ProductService productService;

    public AdminProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public Page<ProductSummaryResponse> list(Pageable pageable) {
        return productService.adminList(pageable);
    }

    @GetMapping("/{id}")
    public ProductDetailResponse get(@PathVariable UUID id) {
        return productService.adminGet(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductDetailResponse create(@Valid @RequestBody CreateProductRequest request) {
        return productService.create(request);
    }

    @PutMapping("/{id}")
    public ProductDetailResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateProductRequest request) {
        return productService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        productService.delete(id);
    }

    @PostMapping("/{id}/variants")
    @ResponseStatus(HttpStatus.CREATED)
    public VariantResponse addVariant(@PathVariable UUID id, @Valid @RequestBody VariantRequest request) {
        return productService.addVariant(id, request);
    }

    @PatchMapping("/variants/{variantId}")
    public VariantResponse updateVariant(@PathVariable UUID variantId, @Valid @RequestBody UpdateVariantRequest request) {
        return productService.updateVariantStock(variantId, request);
    }

    @DeleteMapping("/variants/{variantId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteVariant(@PathVariable UUID variantId) {
        productService.deleteVariant(variantId);
    }

    @PostMapping("/{id}/images")
    @ResponseStatus(HttpStatus.CREATED)
    public ImageResponse addImage(@PathVariable UUID id, @Valid @RequestBody ImageRequest request) {
        return productService.addImage(id, request);
    }

    @DeleteMapping("/images/{imageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteImage(@PathVariable UUID imageId) {
        productService.deleteImage(imageId);
    }
}
