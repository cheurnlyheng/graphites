package com.jess.shop.admin.service;

import com.jess.shop.admin.dto.AdminAuthDtos.AuthResponse;
import com.jess.shop.admin.entity.AdminUser;
import com.jess.shop.admin.repository.AdminUserRepository;
import com.jess.shop.common.security.JwtService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AdminAuthService {

    // bcrypt is deliberately slow -- skipping it entirely when the email doesn't exist (the original
    // code threw before ever calling passwordEncoder.matches()) makes "unknown email" responses
    // measurably faster than "wrong password for a real email" ones. That timing gap lets an attacker
    // enumerate which emails have an admin account without ever guessing a password. Always running a
    // real bcrypt comparison -- against this dummy hash when there's no real one -- closes that gap.
    // Computed once per class load, not per request: BCryptPasswordEncoder's own matches() doesn't
    // depend on which instance generated the hash.
    private static final String DUMMY_HASH = new BCryptPasswordEncoder().encode("no-such-admin-dummy-password");

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AdminAuthService(AdminUserRepository adminUserRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.adminUserRepository = adminUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse login(String email, String rawPassword) {
        AdminUser admin = adminUserRepository.findByEmail(email).orElse(null);
        boolean passwordMatches = passwordEncoder.matches(rawPassword, admin != null ? admin.getPasswordHash() : DUMMY_HASH);

        if (admin == null || !passwordMatches) {
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
