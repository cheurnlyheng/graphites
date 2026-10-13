package com.jess.shop.admin.controller;

import com.jess.shop.admin.dto.AdminAuthDtos.ConfirmTwoFactorRequest;
import com.jess.shop.admin.dto.AdminAuthDtos.DisableTwoFactorRequest;
import com.jess.shop.admin.dto.AdminAuthDtos.TwoFactorSetupResponse;
import com.jess.shop.admin.dto.AdminAuthDtos.TwoFactorStatusResponse;
import com.jess.shop.admin.service.AdminAuthService;
import com.jess.shop.common.security.AuthPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Deliberately NOT under /api/admin/auth/** -- that prefix is permitAll (see SecurityConfig) for the
 * pre-login endpoints, whereas every one of these requires an already-authenticated admin (covered
 * instead by the general /api/admin/** hasRole("ADMIN") rule). */
@RestController
@RequestMapping("/api/admin/2fa")
public class AdminTwoFactorController {

    private final AdminAuthService adminAuthService;

    public AdminTwoFactorController(AdminAuthService adminAuthService) {
        this.adminAuthService = adminAuthService;
    }

    @GetMapping("/status")
    public TwoFactorStatusResponse status(@AuthenticationPrincipal AuthPrincipal principal) {
        return adminAuthService.getTwoFactorStatus(principal.id());
    }

    @PostMapping("/setup")
    public TwoFactorSetupResponse setup(@AuthenticationPrincipal AuthPrincipal principal) {
        return adminAuthService.setupTwoFactor(principal.id());
    }

    @PostMapping("/confirm")
    public void confirm(@AuthenticationPrincipal AuthPrincipal principal, @Valid @RequestBody ConfirmTwoFactorRequest request) {
        adminAuthService.confirmTwoFactor(principal.id(), request.code());
    }

    @PostMapping("/disable")
    public void disable(@AuthenticationPrincipal AuthPrincipal principal, @Valid @RequestBody DisableTwoFactorRequest request) {
        adminAuthService.disableTwoFactor(principal.id(), request.password());
    }
}
