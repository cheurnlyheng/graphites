package com.jess.shop.common.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Simple per-IP rate limiting, in-memory -- fine for a single-instance deployment, not meant to
 * throttle real customers (limits are generous), just to blunt obvious brute-forcing/abuse of the
 * admin login and checkout/order-lookup endpoints. Buckets are never evicted; at this traffic
 * scale (a handful of distinct IPs a day) that's a trivial amount of memory, not worth the
 * complexity of an expiring cache. */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private record Scope(String pathPrefix, int capacity, Duration period) {}

    // Login is the most sensitive -- tight limit. Checkout/order-lookup are generous enough that a
    // real shopper retrying a failed card never notices, but a script hammering the endpoint does.
    private static final Scope[] SCOPES = {
        new Scope("/api/admin/auth/login", 10, Duration.ofMinutes(1)),
        new Scope("/api/checkout", 30, Duration.ofMinutes(1)),
        new Scope("/api/orders", 60, Duration.ofMinutes(1))
    };

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
        for (Scope scope : SCOPES) {
            if (request.getRequestURI().startsWith(scope.pathPrefix())) {
                Bucket bucket = buckets.computeIfAbsent(scope.pathPrefix() + ":" + clientIp(request),
                    key -> Bucket.builder()
                        .addLimit(Bandwidth.builder().capacity(scope.capacity())
                            .refillIntervally(scope.capacity(), scope.period()).build())
                        .build());
                if (!bucket.tryConsume(1)) {
                    response.setStatus(429);
                    response.setContentType("application/json");
                    response.getWriter().write("""
                        {"timestamp":"%s","status":429,"error":"Too Many Requests","message":"Too many requests -- please slow down and try again shortly."}
                        """.formatted(Instant.now()).strip());
                    return;
                }
                break;
            }
        }
        filterChain.doFilter(request, response);
    }

    /** Railway (and most PaaS hosts) sit behind a reverse proxy, so the "real" client IP arrives via
     * this header rather than as the TCP peer address -- falls back to that for local dev.
     *
     * Deliberately takes the LAST entry, not the first: a client can freely set its own
     * X-Forwarded-For on the request it sends, so if a trusted proxy *appends* to that (the
     * standard behavior, e.g. Cloudflare) rather than replacing it outright, the first entry is
     * attacker-controlled and the last is the one the trusted proxy itself observed and added.
     * Only safe because exactly one hop (Railway's edge) is trusted here; if a second trusted
     * proxy is ever added in front of it, this needs to skip that many entries from the end
     * instead of always taking the last one. */
    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String[] hops = forwarded.split(",");
            return hops[hops.length - 1].trim();
        }
        return request.getRemoteAddr();
    }
}
