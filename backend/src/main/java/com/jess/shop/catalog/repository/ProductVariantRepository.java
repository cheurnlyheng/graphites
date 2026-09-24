package com.jess.shop.catalog.repository;

import com.jess.shop.catalog.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, UUID> {

    List<ProductVariant> findByProductId(UUID productId);

    Optional<ProductVariant> findBySku(String sku);

    /**
     * Atomically decrements stock only if enough is available. Returns the number of rows
     * updated (0 or 1) -- callers MUST check this to detect an oversell attempt, e.g. two
     * customers buying the last unit at the same time.
     */
    @Modifying
    @Query("UPDATE ProductVariant v SET v.stockQty = v.stockQty - :qty WHERE v.id = :variantId AND v.stockQty >= :qty")
    int decrementStock(@Param("variantId") UUID variantId, @Param("qty") int qty);

    @Modifying
    @Query("UPDATE ProductVariant v SET v.stockQty = v.stockQty + :qty WHERE v.id = :variantId")
    void incrementStock(@Param("variantId") UUID variantId, @Param("qty") int qty);

    @Query("SELECT v FROM ProductVariant v WHERE v.stockQty <= v.lowStockThreshold")
    List<ProductVariant> findLowStockVariants();
}
