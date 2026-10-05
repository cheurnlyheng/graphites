package com.jess.shop.returns.repository;

import com.jess.shop.returns.entity.ReturnPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReturnPhotoRepository extends JpaRepository<ReturnPhoto, UUID> {
    List<ReturnPhoto> findByReturnRequestIdOrderBySortOrderAsc(UUID returnRequestId);
}
