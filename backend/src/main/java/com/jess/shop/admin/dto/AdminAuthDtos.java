package com.jess.shop.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AdminAuthDtos {

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}

    /** Only succeeds when there are zero admin users yet -- a one-time bootstrap, not an open signup endpoint. */
    public record BootstrapRequest(@Email @NotBlank String email, @Size(min = 8) @NotBlank String password) {}

    public record AuthResponse(String token, String email, String role) {}
}
