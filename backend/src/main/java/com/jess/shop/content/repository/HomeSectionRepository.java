package com.jess.shop.content.repository;

import com.jess.shop.content.entity.HomeSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface HomeSectionRepository extends JpaRepository<HomeSection, UUID> {

    List<HomeSection> findAllByOrderBySortOrderAsc();

    List<HomeSection> findByActiveTrueOrderBySortOrderAsc();

    @Query("SELECT COALESCE(MAX(s.sortOrder), -1) FROM HomeSection s")
    int findMaxSortOrder();
}
