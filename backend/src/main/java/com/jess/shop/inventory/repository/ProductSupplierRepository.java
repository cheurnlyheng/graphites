package com.jess.shop.inventory.repository;

import com.jess.shop.inventory.entity.ProductSupplier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductSupplierRepository extends JpaRepository<ProductSupplier, UUID> {
    List<ProductSupplier> findByProductVariantId(UUID productVariantId);
    Optional<ProductSupplier> findFirstByProductVariantId(UUID productVariantId);
}
