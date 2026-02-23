package com.example.lms.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Rate limiting filter for authentication and AI chat endpoints.
 * Limits requests per IP to prevent brute-force and abuse.
 *
 * <ul>
 *   <li>/api/v3/auth/** — 10 req/min per IP (brute-force prevention)
 *   <li>/api/v3/ai/** — 10 req/min per IP (AI abuse prevention)
 * </ul>
 *
 * Expired entries are cleaned up every 5 minutes to prevent memory leaks.
 */
@Slf4j
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS_PER_MINUTE = 10;
    private static final long WINDOW_MS = 60_000L; // 1 minute

    private final Map<String, RateLimit> rateLimits = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();

        // Only rate limit auth and AI endpoints
        if (!path.startsWith("/api/v3/auth") && !path.startsWith("/api/v3/ai")) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(request);
        String key = clientIp + ":" + path;

        RateLimit rateLimit = rateLimits.compute(key, (k, existing) -> {
            long now = System.currentTimeMillis();
            if (existing == null || now - existing.windowStart.get() > WINDOW_MS) {
                return new RateLimit(new AtomicLong(now), new AtomicInteger(1));
            }
            existing.count.incrementAndGet();
            return existing;
        });

        if (rateLimit.count.get() > MAX_REQUESTS_PER_MINUTE) {
            log.warn("Rate limit exceeded for IP {} on path {}", clientIp, path);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write(
                "{\"success\":false,\"errorCode\":\"RATE_LIMITED\",\"message\":\"Quá nhiều yêu cầu. Vui lòng thử lại sau.\"}"
            );
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Periodically clean up expired rate limit entries to prevent unbounded memory growth.
     * Runs every 5 minutes.
     */
    @Scheduled(fixedRate = 300_000)
    public void cleanupExpiredEntries() {
        long now = System.currentTimeMillis();
        int removed = 0;
        var iterator = rateLimits.entrySet().iterator();
        while (iterator.hasNext()) {
            var entry = iterator.next();
            if (now - entry.getValue().windowStart.get() > WINDOW_MS * 2) {
                iterator.remove();
                removed++;
            }
        }
        if (removed > 0) {
            log.debug("Rate limit cleanup: removed {} expired entries, {} remaining", removed, rateLimits.size());
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private record RateLimit(AtomicLong windowStart, AtomicInteger count) {}
}
