package com.jess.shop.order.repository;

import com.jess.shop.order.entity.Order;
import com.jess.shop.order.entity.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    Optional<Order> findByStripeCheckoutSessionId(String sessionId);

    /** The orders that actually count as revenue for a report: payment went through (PAID or further
     * along), within the window. CANCELLED is excluded even if it was briefly PAID, since a cancelled
     * order is refunded -- see OrderService.cancel. */
    @Query("SELECT o FROM Order o WHERE o.status IN :statuses AND o.paidAt BETWEEN :from AND :to ORDER BY o.paidAt ASC")
    List<Order> findRevenueOrdersBetween(List<OrderStatus> statuses, Instant from, Instant to);

    /** Row-locked variants for the two places where the same order can be changed by two requests at once
     * (a payment arriving from both Stripe's webhook and the confirmation page; a double-clicked Buy Label).
     * The second request waits for the first to commit, then sees the new status and stops. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Order> findAndLockByStripeCheckoutSessionId(String sessionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Order> findAndLockById(UUID id);

    Page<Order> findByStatusOrderByCreatedAtAsc(OrderStatus status, Pageable pageable);
    Page<Order> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
