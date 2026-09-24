package com.jess.shop.inventory.repository;

import com.jess.shop.inventory.entity.PurchaseOrder;
import com.jess.shop.inventory.entity.PurchaseOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, UUID> {
    List<PurchaseOrder> findBySupplierIdAndStatus(UUID supplierId, PurchaseOrderStatus status);
}
