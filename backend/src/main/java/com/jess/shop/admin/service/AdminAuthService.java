package com.jess.shop.admin.service;

import com.jess.shop.admin.dto.AdminAuthDtos.AuthResponse;
import com.jess.shop.admin.dto.AdminAuthDtos.TwoFactorSetupResponse;
import com.jess.shop.admin.dto.AdminAuthDtos.TwoFactorStatusResponse;
import com.jess.shop.admin.entity.AdminUser;
import com.jess.shop.admin.repository.AdminUserRepository;
import com.jess.shop.common.exception.ResourceNotFoundException;
import com.jess.shop.common.security.JwtService;
import dev.samstevens.totp.code.CodeGenerator;
import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

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

    // Role claim on the short-lived token issued between the two steps of a 2FA login -- distinct
    // from "ADMIN" so this token can't pass any hasRole("ADMIN") check even if it leaked, on top of
    // its own five-minute expiry and the fact /verify-2fa is the only endpoint that reads it.
    private static final String PENDING_2FA_ROLE = "PENDING_2FA";
    private static final long PENDING_2FA_EXPIRATION_MINUTES = 5;

    private static final String TOTP_ISSUER = "Graphites";

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SecretGenerator secretGenerator = new DefaultSecretGenerator();
    private final CodeVerifier codeVerifier;

    public AdminAuthService(AdminUserRepository adminUserRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.adminUserRepository = adminUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        TimeProvider timeProvider = new SystemTimeProvider();
        CodeGenerator codeGenerator = new DefaultCodeGenerator();
        this.codeVerifier = new DefaultCodeVerifier(codeGenerator, timeProvider);
    }

    public AuthResponse login(String email, String rawPassword) {
        AdminUser admin = adminUserRepository.findByEmail(email).orElse(null);
        boolean passwordMatches = passwordEncoder.matches(rawPassword, admin != null ? admin.getPasswordHash() : DUMMY_HASH);

        if (admin == null || !passwordMatches) {
            throw new BadCredentialsException("Invalid email or password");
        }

        if (admin.isTotpEnabled()) {
            String pendingToken = jwtService.generateToken(admin.getId(), admin.getEmail(), PENDING_2FA_ROLE, PENDING_2FA_EXPIRATION_MINUTES);
            return AuthResponse.twoFactorRequired(admin.getEmail(), pendingToken);
        }

        String token = jwtService.generateToken(admin.getId(), admin.getEmail(), admin.getRole());
        return AuthResponse.authenticated(token, admin.getEmail(), admin.getRole());
    }

    /** Second step of login once the account has 2FA on -- pendingToken proves the password already
     * checked out (see login() above), code is what the admin's authenticator app shows right now. */
    public AuthResponse verifyTwoFactor(String pendingToken, String code) {
        Claims claims;
        try {
            claims = jwtService.parseClaims(pendingToken);
        } catch (JwtException | IllegalArgumentException e) {
            throw new BadCredentialsException("Your login session expired -- please sign in again");
        }
        if (!PENDING_2FA_ROLE.equals(claims.get("role", String.class))) {
            throw new BadCredentialsException("Invalid login session");
        }

        AdminUser admin = adminUserRepository.findById(UUID.fromString(claims.getSubject()))
            .orElseThrow(() -> new BadCredentialsException("Invalid login session"));
        if (!admin.isTotpEnabled() || admin.getTotpSecret() == null || !codeVerifier.isValidCode(admin.getTotpSecret(), code)) {
            throw new BadCredentialsException("Invalid verification code");
        }

        String token = jwtService.generateToken(admin.getId(), admin.getEmail(), admin.getRole());
        return AuthResponse.authenticated(token, admin.getEmail(), admin.getRole());
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
        return AuthResponse.authenticated(token, admin.getEmail(), admin.getRole());
    }

    public TwoFactorStatusResponse getTwoFactorStatus(UUID adminId) {
        return new TwoFactorStatusResponse(getOrThrow(adminId).isTotpEnabled());
    }

    /** Generates a new secret and stores it, but does NOT turn 2FA on yet -- confirmTwoFactor does
     * that, once the admin proves they actually scanned it by submitting a real code from it.
     * Re-callable while not yet enabled (e.g. the QR didn't scan), which simply replaces the secret. */
    @Transactional
    public TwoFactorSetupResponse setupTwoFactor(UUID adminId) {
        AdminUser admin = getOrThrow(adminId);
        if (admin.isTotpEnabled()) {
            throw new IllegalStateException("Two-factor authentication is already enabled -- disable it first to re-enroll");
        }
        String secret = secretGenerator.generate();
        admin.setTotpSecret(secret);
        adminUserRepository.save(admin);
        return new TwoFactorSetupResponse(secret, buildProvisioningUri(admin.getEmail(), secret));
    }

    @Transactional
    public void confirmTwoFactor(UUID adminId, String code) {
        AdminUser admin = getOrThrow(adminId);
        if (admin.getTotpSecret() == null) {
            throw new IllegalStateException("Start two-factor setup first");
        }
        if (!codeVerifier.isValidCode(admin.getTotpSecret(), code)) {
            throw new IllegalArgumentException("That code didn't match -- check your authenticator app and try again");
        }
        admin.setTotpEnabled(true);
        adminUserRepository.save(admin);
    }

    /** Requires the current password (not just an active session) so a left-open, unlocked admin
     * tab can't be used by someone else to strip 2FA off the account. */
    @Transactional
    public void disableTwoFactor(UUID adminId, String currentPassword) {
        AdminUser admin = getOrThrow(adminId);
        if (!passwordEncoder.matches(currentPassword, admin.getPasswordHash())) {
            throw new BadCredentialsException("Incorrect password");
        }
        admin.setTotpEnabled(false);
        admin.setTotpSecret(null);
        adminUserRepository.save(admin);
    }

    private AdminUser getOrThrow(UUID adminId) {
        return adminUserRepository.findById(adminId)
            .orElseThrow(() -> new ResourceNotFoundException("Admin not found: " + adminId));
    }

    // Standard "Google Authenticator Key URI Format" -- every mainstream authenticator app (Google
    // Authenticator, Authy, 1Password, etc.) scans this same otpauth:// scheme.
    private static String buildProvisioningUri(String email, String secret) {
        String label = URLEncoder.encode(TOTP_ISSUER + ":" + email, StandardCharsets.UTF_8);
        String issuer = URLEncoder.encode(TOTP_ISSUER, StandardCharsets.UTF_8);
        return "otpauth://totp/" + label + "?secret=" + secret + "&issuer=" + issuer
            + "&algorithm=SHA1&digits=6&period=30";
    }
}
