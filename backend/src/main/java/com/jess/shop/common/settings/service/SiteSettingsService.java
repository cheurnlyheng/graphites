package com.jess.shop.common.settings.service;

import com.jess.shop.common.settings.dto.SiteSettingsDtos.MaintenanceStatusResponse;
import com.jess.shop.common.settings.entity.SiteSettings;
import com.jess.shop.common.settings.repository.SiteSettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class SiteSettingsService {

    private final SiteSettingsRepository repository;

    public SiteSettingsService(SiteSettingsRepository repository) {
        this.repository = repository;
    }

    /** Called on (effectively) every storefront request by MaintenanceModeFilter -- just the one
     * boolean column off a single-row, primary-key lookup, cheap enough to not need caching at
     * this traffic scale (same call made for the rate limiter's per-IP map). */
    public boolean isMaintenanceMode() {
        return getOrCreate().isMaintenanceMode();
    }

    public MaintenanceStatusResponse getStatus() {
        SiteSettings settings = getOrCreate();
        return new MaintenanceStatusResponse(settings.isMaintenanceMode(), settings.getMaintenanceMessage());
    }

    @Transactional
    public MaintenanceStatusResponse setMaintenanceMode(boolean enabled, String message) {
        SiteSettings settings = getOrCreate();
        settings.setMaintenanceMode(enabled);
        settings.setMaintenanceMessage(message != null && !message.isBlank() ? message : null);
        settings.setUpdatedAt(Instant.now());
        repository.save(settings);
        return new MaintenanceStatusResponse(settings.isMaintenanceMode(), settings.getMaintenanceMessage());
    }

    // The seed migration always inserts this row, but a missing row shouldn't be a 500 for every
    // single storefront request if it somehow ever is -- defaults to maintenance OFF.
    private SiteSettings getOrCreate() {
        return repository.findById(SiteSettings.SINGLETON_ID).orElseGet(() -> {
            SiteSettings settings = new SiteSettings();
            settings.setId(SiteSettings.SINGLETON_ID);
            settings.setMaintenanceMode(false);
            settings.setUpdatedAt(Instant.now());
            return repository.save(settings);
        });
    }
}
