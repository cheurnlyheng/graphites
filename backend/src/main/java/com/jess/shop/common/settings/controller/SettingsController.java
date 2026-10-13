package com.jess.shop.common.settings.controller;

import com.jess.shop.common.settings.dto.SiteSettingsDtos.MaintenanceStatusResponse;
import com.jess.shop.common.settings.service.SiteSettingsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public (see SecurityConfig) -- the frontend's own middleware calls this, unauthenticated, on
 * every storefront request to decide whether to show the maintenance page. */
@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SiteSettingsService siteSettingsService;

    public SettingsController(SiteSettingsService siteSettingsService) {
        this.siteSettingsService = siteSettingsService;
    }

    @GetMapping("/maintenance")
    public MaintenanceStatusResponse maintenance() {
        return siteSettingsService.getStatus();
    }
}
