package com.jess.shop.common.settings.repository;

import com.jess.shop.common.settings.entity.SiteSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SiteSettingsRepository extends JpaRepository<SiteSettings, Integer> {
}
