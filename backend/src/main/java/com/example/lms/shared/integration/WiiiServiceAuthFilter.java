package com.example.lms.shared.integration;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.security.MessageDigest;

/**
 * Service-to-service auth filter for Wiii AI integration endpoints.
 *
 * <p>Only applies to {@code /api/v3/integration/**} paths.
 * Validates Bearer token against {@code wiii.service-token} config.
 *
 * <p>This filter runs BEFORE Spring Security's JWT filter
 * (which handles user authentication). Integration endpoints
 * are whitelisted in SecurityConfig to bypass user JWT auth.
 */
@Component
@Order(1)
public class WiiiServiceAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(WiiiServiceAuthFilter.class);
    private static final String INTEGRATION_PATH = "/api/v3/integration/";

    private final WiiiIntegrationConfig config;

    public WiiiServiceAuthFilter(WiiiIntegrationConfig config) {
        this.config = config;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Only filter integration paths
        return !request.getRequestURI().startsWith(INTEGRATION_PATH);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain)
            throws ServletException, IOException {

        String serviceToken = config.getServiceToken();

        // Fail closed: integration endpoints are permitAll() and rely on this filter
        // for service-to-service authentication.
        if (serviceToken == null || serviceToken.isBlank()) {
            log.error("Integration auth: no service-token configured, rejecting request");
            response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"message\":\"Integration service token is not configured\"}");
            return;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("Integration auth: missing or invalid Authorization header");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"message\":\"Missing service token\"}");
            return;
        }

        String token = authHeader.substring(7);
        // Constant-time comparison to prevent timing attacks
        if (!MessageDigest.isEqual(token.getBytes(), serviceToken.getBytes())) {
            log.warn("Integration auth: invalid service token");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"message\":\"Invalid service token\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
