package com.jess.shop.common.security;

import com.jess.shop.common.settings.service.SiteSettingsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;

/** Full-lockdown maintenance mode: while on, every customer-facing request gets a 503 instead of
 * reaching its controller -- the frontend's own middleware shows the "back soon" page for a human,
 * this is the backend half so a direct API call (curl, a script) can't complete a purchase behind
 * its back. Admin, the Stripe/Shippo webhooks, this status check itself, and /uploads (shown inside
 * the admin dashboard too) are exempt -- Jess needs all four of those to still work in order to
 * turn this back off, and in-flight payment/shipping events shouldn't get dropped just because
 * maintenance started mid-flight. */
@Component
public class MaintenanceModeFilter extends OncePerRequestFilter {

    private static final String[] EXEMPT_PREFIXES = {"/api/admin", "/api/webhooks", "/api/settings", "/uploads"};

    private final SiteSettingsService siteSettingsService;

    public MaintenanceModeFilter(SiteSettingsService siteSettingsService) {
        this.siteSettingsService = siteSettingsService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
        String uri = request.getRequestURI();
        boolean exempt = false;
        for (String prefix : EXEMPT_PREFIXES) {
            if (uri.startsWith(prefix)) {
                exempt = true;
                break;
            }
        }

        if (!exempt && siteSettingsService.isMaintenanceMode()) {
            response.setStatus(503);
            response.setContentType("application/json");
            response.getWriter().write("""
                {"timestamp":"%s","status":503,"error":"Service Unavailable","message":"This store is temporarily down for maintenance -- please check back shortly."}
                """.formatted(Instant.now()).strip());
            return;
        }
        filterChain.doFilter(request, response);
    }
}
