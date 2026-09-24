package com.jess.shop.common.security;

import java.util.UUID;

/** The authenticated identity extracted from a JWT: either an admin user or a customer, distinguished by role. */
public record AuthPrincipal(UUID id, String email, String role) {

    public boolean isAdmin() {
        return "ADMIN".equals(role);
    }
}
