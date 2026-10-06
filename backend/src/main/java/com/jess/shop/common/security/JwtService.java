package com.jess.shop.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtService {

    private final SecretKey key;
    private final long expirationMinutes;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                       @Value("${app.jwt.expiration-minutes}") long expirationMinutes) {
        // HS256 needs a >=256-bit key. Silently zero-padding a short secret used to let the app start
        // "successfully" with a weak key -- the padding bytes are constant/known, so it doesn't add
        // real entropy, it just hides a misconfiguration. Same "fail loud" policy as a missing secret.
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                "JWT_SECRET is too short (" + keyBytes.length + " bytes; need >= 32 for HS256). " +
                "Generate a real one, e.g.: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"");
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.expirationMinutes = expirationMinutes;
    }

    public String generateToken(UUID subjectId, String email, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
            .subject(subjectId.toString())
            .claim("email", email)
            .claim("role", role)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(expirationMinutes, ChronoUnit.MINUTES)))
            .signWith(key)
            .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}
