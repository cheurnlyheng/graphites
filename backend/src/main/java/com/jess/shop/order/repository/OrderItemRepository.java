package com.jess.shop.order.repository;

import com.jess.shop.order.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderItemRepository extends JpaRepository<OrderItem, UUID> {
    List<OrderItem> findByOrderId(UUID orderId);
    List<OrderItem> findByOrderIdIn(List<UUID> orderIds);
    Optional<OrderItem> findById(UUID id);
}
