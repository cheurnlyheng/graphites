package com.jess.shop.cart.repository;

import com.jess.shop.cart.entity.Cart;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CartRepository extends JpaRepository<Cart, UUID> {
    Optional<Cart> findBySessionToken(String sessionToken);
}
