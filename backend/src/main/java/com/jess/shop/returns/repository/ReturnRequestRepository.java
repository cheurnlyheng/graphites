package com.jess.shop.returns.repository;

import com.jess.shop.returns.entity.ReturnRequest;
import com.jess.shop.returns.entity.ReturnStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, UUID> {
    List<ReturnRequest> findByCustomerId(UUID customerId);
    List<ReturnRequest> findByOrderId(UUID orderId);
    Page<ReturnRequest> findByStatus(ReturnStatus status, Pageable pageable);
}
