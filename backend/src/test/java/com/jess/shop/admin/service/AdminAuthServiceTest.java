package com.jess.shop.admin.service;

import com.jess.shop.admin.dto.AdminAuthDtos.AuthResponse;
import com.jess.shop.admin.dto.AdminAuthDtos.TwoFactorSetupResponse;
import com.jess.shop.admin.entity.AdminUser;
import com.jess.shop.admin.repository.AdminUserRepository;
import com.jess.shop.common.security.JwtService;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.exceptions.CodeGenerationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/** Covers the admin login 2FA round trip end to end against the real TOTP library (not mocked) --
 * the one place a subtle RFC 6238 mistake (wrong time period, wrong counter math) would otherwise
 * only surface in production when a real authenticator app's code mysteriously never validates. */
@ExtendWith(MockitoExtension.class)
class AdminAuthServiceTest {

    @Mock private AdminUserRepository adminUserRepository;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final JwtService jwtService = new JwtService("test-only-secret-at-least-32-bytes-long!!", 60);
    private AdminAuthService service;
    private AdminUser admin;

    @BeforeEach
    void setUp() {
        service = new AdminAuthService(adminUserRepository, passwordEncoder, jwtService);
        admin = AdminUser.builder()
            .id(UUID.randomUUID())
            .email("jess@graphites.world")
            .passwordHash(passwordEncoder.encode("correct-horse-battery-staple"))
            .role("ADMIN")
            .build();
    }

    private String currentCodeFor(String secret) {
        try {
            long counter = Instant.now().getEpochSecond() / 30;
            return new DefaultCodeGenerator().generate(secret, counter);
        } catch (CodeGenerationException e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void loginWithout2faReturnsARealTokenImmediately() {
        when(adminUserRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));

        AuthResponse response = service.login(admin.getEmail(), "correct-horse-battery-staple");

        assertThat(response.twoFactorRequired()).isFalse();
        assertThat(response.token()).isNotBlank();
        assertThat(response.pendingToken()).isNull();
    }

    @Test
    void loginWith2faEnabledWithholdsTheRealTokenUntilVerified() {
        admin.setTotpEnabled(true);
        admin.setTotpSecret("JBSWY3DPEHPK3PXP");
        when(adminUserRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));

        AuthResponse response = service.login(admin.getEmail(), "correct-horse-battery-staple");

        assertThat(response.twoFactorRequired()).isTrue();
        assertThat(response.token()).isNull();
        assertThat(response.pendingToken()).isNotBlank();
    }

    @Test
    void verifyTwoFactorIssuesARealTokenForACorrectCode() {
        admin.setTotpEnabled(true);
        admin.setTotpSecret("JBSWY3DPEHPK3PXP");
        when(adminUserRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(adminUserRepository.findById(admin.getId())).thenReturn(Optional.of(admin));

        String pendingToken = service.login(admin.getEmail(), "correct-horse-battery-staple").pendingToken();
        AuthResponse response = service.verifyTwoFactor(pendingToken, currentCodeFor(admin.getTotpSecret()));

        assertThat(response.twoFactorRequired()).isFalse();
        assertThat(response.token()).isNotBlank();
    }

    @Test
    void verifyTwoFactorRejectsAWrongCode() {
        admin.setTotpEnabled(true);
        admin.setTotpSecret("JBSWY3DPEHPK3PXP");
        when(adminUserRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(adminUserRepository.findById(admin.getId())).thenReturn(Optional.of(admin));

        String pendingToken = service.login(admin.getEmail(), "correct-horse-battery-staple").pendingToken();

        assertThatThrownBy(() -> service.verifyTwoFactor(pendingToken, "000000"))
            .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void setupGeneratesASecretAndUriButDoesNotEnableYet() {
        when(adminUserRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(adminUserRepository.save(any())).thenReturn(admin);

        TwoFactorSetupResponse setup = service.setupTwoFactor(admin.getId());

        assertThat(setup.secret()).isNotBlank();
        assertThat(setup.uri()).startsWith("otpauth://totp/");
        assertThat(setup.uri()).contains(admin.getEmail().replace("@", "%40"));
        assertThat(admin.isTotpEnabled()).isFalse();
    }

    @Test
    void confirmWithTheRightCodeTurnsTwoFactorOn() {
        admin.setTotpSecret("JBSWY3DPEHPK3PXP");
        when(adminUserRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(adminUserRepository.save(any())).thenReturn(admin);

        service.confirmTwoFactor(admin.getId(), currentCodeFor(admin.getTotpSecret()));

        assertThat(admin.isTotpEnabled()).isTrue();
    }

    @Test
    void confirmWithTheWrongCodeLeavesItDisabled() {
        admin.setTotpSecret("JBSWY3DPEHPK3PXP");
        when(adminUserRepository.findById(admin.getId())).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> service.confirmTwoFactor(admin.getId(), "000000"))
            .isInstanceOf(IllegalArgumentException.class);
        assertThat(admin.isTotpEnabled()).isFalse();
    }

    @Test
    void disableRequiresTheCurrentPassword() {
        admin.setTotpEnabled(true);
        admin.setTotpSecret("JBSWY3DPEHPK3PXP");
        when(adminUserRepository.findById(admin.getId())).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> service.disableTwoFactor(admin.getId(), "wrong-password"))
            .isInstanceOf(BadCredentialsException.class);
        assertThat(admin.isTotpEnabled()).isTrue();
    }

    @Test
    void disableWithTheRightPasswordClearsTheSecret() {
        admin.setTotpEnabled(true);
        admin.setTotpSecret("JBSWY3DPEHPK3PXP");
        when(adminUserRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(adminUserRepository.save(any())).thenReturn(admin);

        service.disableTwoFactor(admin.getId(), "correct-horse-battery-staple");

        assertThat(admin.isTotpEnabled()).isFalse();
        assertThat(admin.getTotpSecret()).isNull();
    }
}
