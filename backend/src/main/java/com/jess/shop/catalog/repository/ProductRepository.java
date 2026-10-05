package com.jess.shop.catalog.repository;

import com.jess.shop.catalog.entity.Product;
import com.jess.shop.catalog.entity.ProductStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    Optional<Product> findBySlug(String slug);

    Page<Product> findByStatus(ProductStatus status, Pageable pageable);

    Page<Product> findByStatusAndCategoryId(ProductStatus status, UUID categoryId, Pageable pageable);

    long countByCategoryId(UUID categoryId);

    @Query("""
        SELECT p FROM Product p
        WHERE p.status = com.jess.shop.catalog.entity.ProductStatus.ACTIVE
          AND LOWER(p.name) LIKE LOWER(CONCAT('%', :term, '%'))
        """)
    Page<Product> search(@Param("term") String term, Pageable pageable);
}
