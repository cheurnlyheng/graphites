package com.jess.shop.common.settings.controller;

import com.jess.shop.common.settings.dto.SiteSettingsDtos.MaintenanceStatusResponse;
import com.jess.shop.common.settings.dto.SiteSettingsDtos.UpdateMaintenanceRequest;
import com.jess.shop.common.settings.service.SiteSettingsService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Guarded by SecurityConfig's /api/admin/** ROLE_ADMIN rule, same as every other admin controller. */
@RestController
@RequestMapping("/api/admin/settings")
public class AdminSettingsController {

    private final SiteSettingsService siteSettingsService;

    public AdminSettingsController(SiteSettingsService siteSettingsService) {
        this.siteSettingsService = siteSettingsService;
    }

    @GetMapping("/maintenance")
    public MaintenanceStatusResponse getMaintenance() {
        return siteSettingsService.getStatus();
    }

    @PutMapping("/maintenance")
    public MaintenanceStatusResponse setMaintenance(@Valid @RequestBody UpdateMaintenanceRequest request) {
        return siteSettingsService.setMaintenanceMode(request.enabled(), request.message());
    }
}
