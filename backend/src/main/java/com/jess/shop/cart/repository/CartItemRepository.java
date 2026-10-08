package com.jess.shop.cart.repository;

import com.jess.shop.cart.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CartItemRepository extends JpaRepository<CartItem, UUID> {
    // Explicitly ordered by when each line was added, with id as a tiebreaker -- an unordered
    // findByCartId left the cart's item order up to whatever Postgres felt like for a given scan,
    // which visibly shifted after an UPDATE (editing a line's quantity could make it jump position
    // in the list). created_at alone isn't quite enough either: every row that existed before that
    // column was added shares the exact same migration-time value, so without a second, always-
    // distinct tiebreaker those still-tied rows were just as free to reorder on an UPDATE as before.
    List<CartItem> findByCartIdOrderByCreatedAtAscIdAsc(UUID cartId);
    Optional<CartItem> findByCartIdAndProductVariantId(UUID cartId, UUID productVariantId);
    void deleteByCartIdAndProductVariantId(UUID cartId, UUID productVariantId);
    void deleteByCartId(UUID cartId);
}
