package com.jess.shop.content.repository;

import com.jess.shop.content.entity.HomeSectionProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface HomeSectionProductRepository extends JpaRepository<HomeSectionProduct, UUID> {

    List<HomeSectionProduct> findBySectionIdOrderBySortOrderAsc(UUID sectionId);

    /** A bulk delete that runs immediately. A derived deleteBy would only be queued, and Hibernate flushes
     * inserts before deletes -- re-adding the same product to the section would then trip the unique key. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("DELETE FROM HomeSectionProduct l WHERE l.sectionId = :sectionId")
    void deleteAllBySection(@Param("sectionId") UUID sectionId);
}
