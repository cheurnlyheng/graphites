package com.jess.shop.catalog.controller;

import com.jess.shop.catalog.dto.ProductDtos.ProductDetailResponse;
import com.jess.shop.catalog.dto.ProductDtos.ProductSummaryResponse;
import com.jess.shop.catalog.service.ProductService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Public storefront endpoints -- only ever return ACTIVE products. */
@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public Page<ProductSummaryResponse> browse(
        @RequestParam(required = false) UUID categoryId,
        @RequestParam(required = false) String search,
        Pageable pageable
    ) {
        return productService.browseActive(categoryId, search, pageable);
    }

    @GetMapping("/{slug}")
    public ProductDetailResponse getBySlug(@PathVariable String slug) {
        return productService.getActiveBySlug(slug);
    }
}
