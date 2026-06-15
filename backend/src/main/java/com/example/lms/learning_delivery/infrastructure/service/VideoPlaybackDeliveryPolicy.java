package com.example.lms.learning_delivery.infrastructure.service;

import java.util.Locale;

public final class VideoPlaybackDeliveryPolicy {

    private static final long CACHE_EXPIRY_SAFETY_SECONDS = 5L;

    private VideoPlaybackDeliveryPolicy() {
    }

    public static boolean isMediaDomainEdgeAuthEnabled(
            String edgeAuthMode,
            String edgeHmacSecret,
            long edgeTokenExpirySeconds
    ) {
        return "media_hmac_query".equals(normalizeEdgeAuthMode(edgeAuthMode))
                && edgeHmacSecret != null
                && !edgeHmacSecret.isBlank()
                && edgeTokenExpirySeconds > 0;
    }

    public static String normalizeEdgeAuthMode(String mode) {
        String normalized = mode == null ? "" : mode.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "media_hmac_query", "query_hmac", "hmac_query", "waf_hmac_query", "worker_hmac_query" ->
                    "media_hmac_query";
            default -> "disabled";
        };
    }

    public static long effectiveManifestCacheSeconds(
            long configuredSeconds,
            boolean edgeAuthEnabled,
            long edgeTokenExpirySeconds
    ) {
        long ttlSeconds = Math.max(0, configuredSeconds);
        if (!edgeAuthEnabled) {
            return ttlSeconds;
        }
        return Math.min(ttlSeconds, ttlBelowSignedUrlExpiry(edgeTokenExpirySeconds));
    }

    public static long effectiveObjectRedirectCacheSeconds(
            long configuredSeconds,
            long segmentPresignTtlSeconds
    ) {
        return Math.min(Math.max(0, configuredSeconds), ttlBelowSignedUrlExpiry(segmentPresignTtlSeconds));
    }

    public static String privatePlaybackCacheControl(long ttlSeconds) {
        if (ttlSeconds <= 0) {
            return "private, no-store, max-age=0, s-maxage=0, must-revalidate";
        }
        return "private, max-age=" + ttlSeconds + ", s-maxage=0, must-revalidate";
    }

    private static long ttlBelowSignedUrlExpiry(long signedUrlExpirySeconds) {
        return Math.max(0, signedUrlExpirySeconds - CACHE_EXPIRY_SAFETY_SECONDS);
    }
}
