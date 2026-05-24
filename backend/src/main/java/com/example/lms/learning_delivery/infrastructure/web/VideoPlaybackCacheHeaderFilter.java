package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.learning_delivery.infrastructure.service.VideoPlaybackDeliveryPolicy;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;

@Component
public class VideoPlaybackCacheHeaderFilter extends OncePerRequestFilter {

    @Value("${app.video.manifest-cache-seconds:60}")
    private long manifestCacheSeconds = 60L;

    @Value("${app.video.object-redirect-cache-seconds:30}")
    private long objectRedirectCacheSeconds = 30L;

    @Value("${app.video.segment-presign-ttl-seconds:120}")
    private long segmentPresignTtlSeconds = 120L;

    @Value("${app.video.edge-auth-mode:disabled}")
    private String edgeAuthMode = "disabled";

    @Value("${app.video.edge-hmac-secret:}")
    private String edgeHmacSecret = "";

    @Value("${app.video.edge-token-expiry-seconds:300}")
    private long edgeTokenExpirySeconds = 300L;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri == null
                || !uri.startsWith("/api/v3/video-assets/")
                || !uri.contains("/adaptive/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        filterChain.doFilter(request, response);

        String uri = request.getRequestURI();
        if (response.getStatus() == HttpStatus.OK.value() && isManifestPath(uri)) {
            applyCacheHeaders(response, effectiveManifestCacheSeconds());
            return;
        }
        if (response.getStatus() == HttpStatus.FOUND.value() && uri.endsWith("/object")) {
            applyCacheHeaders(response, effectiveObjectRedirectCacheSeconds());
        }
    }

    private boolean isManifestPath(String uri) {
        return uri.endsWith("/hls/master.m3u8")
                || uri.contains("/hls/playlist")
                || uri.endsWith("/dash/manifest.mpd");
    }

    private void applyCacheHeaders(HttpServletResponse response, long ttlSeconds) {
        response.setHeader(HttpHeaders.CACHE_CONTROL, VideoPlaybackDeliveryPolicy.privatePlaybackCacheControl(ttlSeconds));
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader(HttpHeaders.VARY, "Authorization, Cookie");

        if (ttlSeconds <= 0) {
            response.setHeader(HttpHeaders.PRAGMA, "no-cache");
            response.setDateHeader(HttpHeaders.EXPIRES, 0);
            return;
        }

        Instant expiresAt = Instant.now().plus(Duration.ofSeconds(ttlSeconds));
        response.setHeader(HttpHeaders.PRAGMA, "");
        response.setDateHeader(HttpHeaders.EXPIRES, expiresAt.toEpochMilli());
    }

    private long effectiveManifestCacheSeconds() {
        boolean edgeAuthEnabled = VideoPlaybackDeliveryPolicy.isMediaDomainEdgeAuthEnabled(
                edgeAuthMode,
                edgeHmacSecret,
                edgeTokenExpirySeconds
        );
        return VideoPlaybackDeliveryPolicy.effectiveManifestCacheSeconds(
                manifestCacheSeconds,
                edgeAuthEnabled,
                edgeTokenExpirySeconds
        );
    }

    private long effectiveObjectRedirectCacheSeconds() {
        return VideoPlaybackDeliveryPolicy.effectiveObjectRedirectCacheSeconds(
                objectRedirectCacheSeconds,
                segmentPresignTtlSeconds
        );
    }
}
