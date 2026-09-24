package com.jess.shop.cart.repository;

import com.jess.shop.cart.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CartItemRepository extends JpaRepository<CartItem, UUID> {
    List<CartItem> findByCartId(UUID cartId);
    Optional<CartItem> findByCartIdAndProductVariantId(UUID cartId, UUID productVariantId);
    void deleteByCartIdAndProductVariantId(UUID cartId, UUID productVariantId);
    void deleteByCartId(UUID cartId);
}
