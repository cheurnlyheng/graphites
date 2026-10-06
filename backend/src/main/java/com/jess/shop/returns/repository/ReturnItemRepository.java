package com.jess.shop.returns.repository;

import com.jess.shop.returns.entity.ReturnItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReturnItemRepository extends JpaRepository<ReturnItem, UUID> {
    List<ReturnItem> findByReturnRequestId(UUID returnRequestId);

    // Used to cap a new return at what's actually left to return on this order item -- without
    // summing prior (non-rejected) claims here, the same order item could be returned piecemeal
    // across several separate return requests until its cumulative refunded quantity far exceeds
    // what was ever purchased.
    List<ReturnItem> findByOrderItemId(UUID orderItemId);
}
