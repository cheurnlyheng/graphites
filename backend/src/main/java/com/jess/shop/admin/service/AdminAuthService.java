package com.jess.shop.admin.service;

import com.jess.shop.admin.dto.AdminAuthDtos.AuthResponse;
import com.jess.shop.admin.entity.AdminUser;
import com.jess.shop.admin.repository.AdminUserRepository;
import com.jess.shop.common.security.JwtService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AdminAuthService {

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AdminAuthService(AdminUserRepository adminUserRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.adminUserRepository = adminUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse login(String email, String rawPassword) {
        AdminUser admin = adminUserRepository.findByEmail(email)
            .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(rawPassword, admin.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        String token = jwtService.generateToken(admin.getId(), admin.getEmail(), admin.getRole());
        return new AuthResponse(token, admin.getEmail(), admin.getRole());
    }

    /** Creates the very first admin account. Refuses once any admin already exists, so this can
     * stay a public endpoint without becoming an open door to create arbitrary admin accounts. */
    public AuthResponse bootstrapFirstAdmin(String email, String rawPassword) {
        if (adminUserRepository.count() > 0) {
            throw new IllegalStateException("An admin account already exists -- use /api/admin/auth/login instead");
        }

        AdminUser admin = AdminUser.builder()
            .email(email)
            .passwordHash(passwordEncoder.encode(rawPassword))
            .role("ADMIN")
            .build();
        adminUserRepository.save(admin);

        String token = jwtService.generateToken(admin.getId(), admin.getEmail(), admin.getRole());
        return new AuthResponse(token, admin.getEmail(), admin.getRole());
    }
}
