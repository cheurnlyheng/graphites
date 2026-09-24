package com.jess.shop.order.repository;

import com.jess.shop.order.entity.Order;
import com.jess.shop.order.entity.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    Optional<Order> findByStripeCheckoutSessionId(String sessionId);
    Page<Order> findByStatusOrderByCreatedAtAsc(OrderStatus status, Pageable pageable);
    Page<Order> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
