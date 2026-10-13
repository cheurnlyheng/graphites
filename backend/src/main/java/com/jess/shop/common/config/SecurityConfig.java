package com.jess.shop.common.config;

import com.jess.shop.common.security.JwtAuthFilter;
import com.jess.shop.common.security.MaintenanceModeFilter;
import com.jess.shop.common.security.RateLimitFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final RateLimitFilter rateLimitFilter;
    private final MaintenanceModeFilter maintenanceModeFilter;

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, RateLimitFilter rateLimitFilter, MaintenanceModeFilter maintenanceModeFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.rateLimitFilter = rateLimitFilter;
        this.maintenanceModeFilter = maintenanceModeFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable()) // stateless JSON API, no session cookie to protect
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Stripe calls this directly -- never behind auth, verified instead by webhook signature.
                .requestMatchers("/api/webhooks/**").permitAll()
                .requestMatchers("/api/admin/auth/**").permitAll()
                // The frontend's maintenance-check middleware calls this unauthenticated on every
                // storefront request -- see SettingsController.
                .requestMatchers(HttpMethod.GET, "/api/settings/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/products/**", "/api/categories/**", "/api/home-sections").permitAll()
                // Admin-uploaded images (hero banner etc.) are shown on the public storefront.
                .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                // No customer accounts exist -- cart, checkout, orders and returns are all guest flows.
                // Order/return access is guarded by the order id being an unguessable UUID, not by login.
                .requestMatchers("/api/cart/**", "/api/checkout/**", "/api/orders/**", "/api/returns/**").permitAll()
                // No swagger-ui/v3/api-docs rule here on purpose -- springdoc is disabled outright
                // (see application.yml) rather than gated behind auth, since a Bearer-token role check
                // can't actually protect a page a browser just navigates to directly, and nothing in
                // this project's own workflow uses it. Falls through to anyRequest().authenticated(),
                // which would apply if it were ever re-enabled without updating this file.
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(rateLimitFilter, JwtAuthFilter.class)
            .addFilterBefore(maintenanceModeFilter, RateLimitFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
