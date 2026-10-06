package com.jess.shop.returns.repository;

import com.jess.shop.returns.entity.ReturnRequest;
import com.jess.shop.returns.entity.ReturnStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, UUID> {
    List<ReturnRequest> findByCustomerId(UUID customerId);
    List<ReturnRequest> findByOrderId(UUID orderId);
    Page<ReturnRequest> findByStatus(ReturnStatus status, Pageable pageable);

    // Refunding spends money, so this is locked the same way Order's row is locked for cancel/buyLabel --
    // without it, a double-clicked "Mark Received & Refund" button (or two admins on the same return)
    // both read the not-yet-refunded status before either commits, and both restock + refund.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ReturnRequest> findAndLockById(UUID id);
}
