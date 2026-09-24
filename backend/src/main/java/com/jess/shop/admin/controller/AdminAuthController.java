package com.jess.shop.admin.controller;

import com.jess.shop.admin.dto.AdminAuthDtos.AuthResponse;
import com.jess.shop.admin.dto.AdminAuthDtos.BootstrapRequest;
import com.jess.shop.admin.dto.AdminAuthDtos.LoginRequest;
import com.jess.shop.admin.service.AdminAuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/auth")
public class AdminAuthController {

    private final AdminAuthService adminAuthService;

    public AdminAuthController(AdminAuthService adminAuthService) {
        this.adminAuthService = adminAuthService;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return adminAuthService.login(request.email(), request.password());
    }

    @PostMapping("/bootstrap")
    public AuthResponse bootstrap(@Valid @RequestBody BootstrapRequest request) {
        return adminAuthService.bootstrapFirstAdmin(request.email(), request.password());
    }
}
