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
 * Tiered rate limiting filter using sliding window counters.
 *
 * <p>Designed for 10,000+ concurrent users with NAT/CGNAT safety.
 * Uses per-IP buckets with tiered limits based on endpoint sensitivity.</p>
 *
 * <h3>Rate Limits (per IP, per minute):</h3>
 * <ul>
 *   <li>{@code POST /auth/login} — 20 req/min (brute-force prevention, NAT-safe)</li>
 *   <li>{@code POST /auth/register} — 10 req/min (account creation abuse)</li>
 *   <li>{@code POST /auth/forgot-password} — 5 req/min (email bombing prevention)</li>
 *   <li>{@code /auth/**} (other: refresh, me) — 60 req/min (automated/frequent)</li>
 *   <li>{@code /ai/**} — 30 req/min (AI cost control)</li>
 *   <li>{@code /payments/**} — 30 req/min (payment flow)</li>
 * </ul>
 *
 * <h3>Algorithm:</h3>
 * <p>Sliding window counter: interpolates between current and previous window
 * to avoid burst-at-boundary problems of fixed windows. Used by Cloudflare and Stripe.</p>
 *
 * <p>Expired entries cleaned up every 5 minutes to prevent memory leaks.</p>
 */
@Slf4j
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    // --- Tiered rate limits (requests per minute) ---
    private static final int LIMIT_LOGIN = 20;            // Strict: brute-force, but NAT-safe for 50+ users
    private static final int LIMIT_REGISTER = 10;         // Strict: account creation abuse
    private static final int LIMIT_FORGOT_PASSWORD = 5;   // Very strict: email bombing
    private static final int LIMIT_AUTH_OTHER = 60;        // Generous: refresh + me are automated
    private static final int LIMIT_AI = 30;               // Moderate: AI cost control
    private static final int LIMIT_PAYMENTS = 30;         // Moderate: payment flow has multiple calls

    private static final long WINDOW_MS = 60_000L; // 1 minute

    /**
     * Sliding window state. Stores current and previous window counts
     * to interpolate the effective rate across window boundaries.
     */
    private final Map<String, SlidingWindowCounter> rateLimits = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();

        // Only rate limit auth, AI, and payment endpoints
        if (!path.startsWith("/api/v3/auth") && !path.startsWith("/api/v3/ai")
                && !path.startsWith("/api/v3/payments")) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(request);
        EndpointTier tier = classifyEndpoint(path, method);
        String key = clientIp + ":" + tier.bucketKey;

        long now = System.currentTimeMillis();
        SlidingWindowCounter counter = rateLimits.compute(key, (k, existing) -> {
            if (existing == null) {
                return new SlidingWindowCounter(now, 1, 0, now - WINDOW_MS);
            }
            long elapsed = now - existing.currentWindowStart;
            if (elapsed >= WINDOW_MS) {
                // Slide: current becomes previous, start new current
                return new SlidingWindowCounter(now, 1,
                        existing.currentCount.get(), existing.currentWindowStart);
            }
            existing.currentCount.incrementAndGet();
            return existing;
        });

        // Sliding window estimate: weighted previous + current
        double effectiveCount = counter.getEffectiveCount(now, WINDOW_MS);

        if (effectiveCount > tier.limit) {
            long retryAfterMs = WINDOW_MS - (now - counter.currentWindowStart);
            int retryAfterSec = Math.max(1, (int) Math.ceil(retryAfterMs / 1000.0));

            log.warn("Rate limit exceeded: IP={} bucket={} effective={}/{} retryAfter={}s",
                    clientIp, tier.bucketKey, String.format("%.0f", effectiveCount), tier.limit, retryAfterSec);

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(retryAfterSec));
            response.setContentType("application/json");
            response.getWriter().write(
                "{\"success\":false,\"errorCode\":\"RATE_LIMITED\",\"message\":\"Quá nhiều yêu cầu. Vui lòng thử lại sau " + retryAfterSec + " giây.\"}"
            );
            return;
        }

        // Add rate limit headers (standard draft RFC)
        response.setHeader("X-RateLimit-Limit", String.valueOf(tier.limit));
        response.setHeader("X-RateLimit-Remaining",
                String.valueOf(Math.max(0, tier.limit - (int) Math.ceil(effectiveCount))));

        filterChain.doFilter(request, response);
    }

    /**
     * Classify the endpoint into a rate limit tier.
     * Each tier has its own bucket key and limit.
     */
    private EndpointTier classifyEndpoint(String path, String method) {
        if (path.startsWith("/api/v3/auth")) {
            // POST /auth/login — brute-force protection
            if ("POST".equals(method) && path.endsWith("/login")) {
                return new EndpointTier("auth:login", LIMIT_LOGIN);
            }
            // POST /auth/register — account creation abuse
            if ("POST".equals(method) && path.endsWith("/register")) {
                return new EndpointTier("auth:register", LIMIT_REGISTER);
            }
            // POST /auth/forgot-password — email bombing
            if ("POST".equals(method) && path.contains("forgot-password")) {
                return new EndpointTier("auth:forgot-password", LIMIT_FORGOT_PASSWORD);
            }
            // Everything else (refresh, me, reset-password) — generous
            return new EndpointTier("auth:other", LIMIT_AUTH_OTHER);
        }
        if (path.startsWith("/api/v3/payments")) {
            return new EndpointTier("payments", LIMIT_PAYMENTS);
        }
        // AI endpoints
        return new EndpointTier("ai", LIMIT_AI);
    }

    /**
     * Periodically clean up expired rate limit entries to prevent unbounded memory growth.
     * Runs every 5 minutes. With 10k users, worst case ~60k entries (10k IPs * 6 tiers),
     * each ~48 bytes = ~2.9 MB — well within memory limits.
     */
    @Scheduled(fixedRate = 300_000)
    public void cleanupExpiredEntries() {
        long now = System.currentTimeMillis();
        int removed = 0;
        var iterator = rateLimits.entrySet().iterator();
        while (iterator.hasNext()) {
            var entry = iterator.next();
            SlidingWindowCounter counter = entry.getValue();
            // Remove if both current and previous windows are expired
            if (now - counter.currentWindowStart > WINDOW_MS * 2) {
                iterator.remove();
                removed++;
            }
        }
        if (removed > 0) {
            log.debug("Rate limit cleanup: removed {} expired entries, {} remaining", removed, rateLimits.size());
        }
    }

    /**
     * Extract client IP from X-Forwarded-For header.
     * Uses the RIGHTMOST IP (added by Caddy/nginx reverse proxy) to prevent spoofing.
     * The leftmost IP is client-controlled and can be forged.
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            String[] ips = xForwardedFor.split(",");
            // Rightmost non-empty IP = added by trusted reverse proxy (Caddy)
            for (int i = ips.length - 1; i >= 0; i--) {
                String ip = ips[i].trim();
                if (!ip.isEmpty()) {
                    return ip;
                }
            }
        }
        return request.getRemoteAddr();
    }

    /**
     * Sliding window counter: stores current and previous window counts.
     * Effective count = previousCount * overlapWeight + currentCount.
     * This smooths out the burst-at-boundary problem of fixed windows.
     */
    private static class SlidingWindowCounter {
        final long currentWindowStart;
        final AtomicInteger currentCount;
        final int previousCount;
        final long previousWindowStart;

        SlidingWindowCounter(long currentWindowStart, int initialCount,
                             int previousCount, long previousWindowStart) {
            this.currentWindowStart = currentWindowStart;
            this.currentCount = new AtomicInteger(initialCount);
            this.previousCount = previousCount;
            this.previousWindowStart = previousWindowStart;
        }

        /**
         * Calculate effective request count using sliding window interpolation.
         * Weight of previous window = fraction of previous window still "active".
         */
        double getEffectiveCount(long now, long windowMs) {
            long elapsed = now - currentWindowStart;
            double overlapWeight = Math.max(0, 1.0 - ((double) elapsed / windowMs));
            return (previousCount * overlapWeight) + currentCount.get();
        }
    }

    private record EndpointTier(String bucketKey, int limit) {}
}
