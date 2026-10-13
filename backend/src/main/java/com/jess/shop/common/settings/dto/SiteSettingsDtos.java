package com.jess.shop.common.settings.dto;

public class SiteSettingsDtos {

    /** Public shape -- just enough for the frontend's maintenance check, nothing else on
     * SiteSettings is exposed to unauthenticated callers. */
    public record MaintenanceStatusResponse(boolean enabled, String message) {}

    public record UpdateMaintenanceRequest(boolean enabled, String message) {}
}
