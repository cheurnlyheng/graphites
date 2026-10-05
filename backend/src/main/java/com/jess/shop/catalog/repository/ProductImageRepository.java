package com.jess.shop.catalog.repository;

import com.jess.shop.catalog.entity.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ProductImageRepository extends JpaRepository<ProductImage, UUID> {
    List<ProductImage> findByProductIdOrderBySortOrderAsc(UUID productId);
    // Batch form for listing pages -- one query for every product on the page instead of one
    // query per product (see ProductService.toSummaries).
    List<ProductImage> findByProductIdInOrderBySortOrderAsc(Collection<UUID> productIds);
    void deleteByProductId(UUID productId);
}
