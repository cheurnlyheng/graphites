package com.jess.shop.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AdminAuthDtos {

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}

    /** Only succeeds when there are zero admin users yet -- a one-time bootstrap, not an open signup endpoint. */
    public record BootstrapRequest(@Email @NotBlank String email, @Size(min = 8) @NotBlank String password) {}

    /** token/role are null and twoFactorRequired is true when the password checked out but the
     * account has 2FA on -- pendingToken then goes to /login/verify-2fa along with the authenticator
     * code. Otherwise token/role are the real, usable credentials and the other two are null. */
    public record AuthResponse(String token, String email, String role, boolean twoFactorRequired, String pendingToken) {
        public static AuthResponse authenticated(String token, String email, String role) {
            return new AuthResponse(token, email, role, false, null);
        }

        public static AuthResponse twoFactorRequired(String email, String pendingToken) {
            return new AuthResponse(null, email, null, true, pendingToken);
        }
    }

    public record VerifyTwoFactorRequest(@NotBlank String pendingToken, @NotBlank String code) {}

    public record TwoFactorStatusResponse(boolean enabled) {}

    /** uri is the full otpauth:// provisioning string -- the frontend renders it as a QR code itself
     * (see admin/settings/security), nothing server-side generates an image. secret is also returned
     * for the "can't scan it" manual-entry fallback every authenticator app supports. */
    public record TwoFactorSetupResponse(String secret, String uri) {}

    public record ConfirmTwoFactorRequest(@NotBlank String code) {}

    public record DisableTwoFactorRequest(@NotBlank String password) {}
}
