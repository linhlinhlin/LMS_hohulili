package com.example.lms.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.util.AntPathMatcher;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Shared registry for permit-all API routes.
 *
 * <p>SecurityConfig uses these matchers to define public routes, while
 * JwtAuthenticationFilter uses the same source of truth to decide whether an
 * invalid bearer token should downgrade to anonymous access or fail fast with 401.</p>
 */
@Component
public class PublicApiEndpointMatcher {

    private static final List<String> PUBLIC_ENDPOINT_PATTERNS = List.of(
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/api/v3/auth/**",
            "/api/v3/ai/health",
            "/api/v3/ai/ping",
            "/api/v3/courses",
            "/api/v3/courses/*",
            "/api/v3/courses/*/content",
            "/api/v3/courses/lessons/*",
            "/api/v3/courses/chapters/*",
            "/api/v3/categories",
            "/api/v3/course-categories",
            "/api/v3/course-categories/**",
            "/api/v3/course-tags",
            "/api/v3/organizations/default",
            "/uploads/**",
            "/api/v3/student/certificates/*/verify",
            "/api/v3/certificates/verify/*",
            "/api/v3/courses/*/reviews",
            "/api/v3/courses/*/reviews/summary",
            "/actuator/health",
            "/api/v3/integration/**",
            "/api/v3/payments/vnpay-ipn",
            "/api/v3/payments/vnpay-return",
            "/api/v3/payments/sepay/webhook",
            "/api/v3/invites/validate",
            "/api/v3/invites/validate-token",
            "/api/v3/video-assets/*/adaptive/**",
            "/ws/**"
    );

    private final List<RequestMatcher> requestMatchers = PUBLIC_ENDPOINT_PATTERNS.stream()
            .<RequestMatcher>map(AntPathRequestMatcher::new)
            .toList();
    private final AntPathMatcher antPathMatcher = new AntPathMatcher();

    public boolean matches(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path == null || path.isBlank()) {
            return false;
        }
        return PUBLIC_ENDPOINT_PATTERNS.stream()
                .anyMatch(pattern -> antPathMatcher.match(pattern, path));
    }

    public RequestMatcher[] asArray() {
        return requestMatchers.toArray(RequestMatcher[]::new);
    }
}
