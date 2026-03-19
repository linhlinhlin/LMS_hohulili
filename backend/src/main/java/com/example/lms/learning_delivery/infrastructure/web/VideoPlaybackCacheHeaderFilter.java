package com.example.lms.learning_delivery.infrastructure.web;

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
    private long manifestCacheSeconds;

    @Value("${app.video.object-redirect-cache-seconds:30}")
    private long objectRedirectCacheSeconds;

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
            applyCacheHeaders(response, Math.max(10, manifestCacheSeconds));
            return;
        }
        if (response.getStatus() == HttpStatus.FOUND.value() && uri.endsWith("/object")) {
            applyCacheHeaders(response, Math.max(10, objectRedirectCacheSeconds));
        }
    }

    private boolean isManifestPath(String uri) {
        return uri.endsWith("/hls/master.m3u8")
                || uri.contains("/hls/playlist")
                || uri.endsWith("/dash/manifest.mpd");
    }

    private void applyCacheHeaders(HttpServletResponse response, long ttlSeconds) {
        Instant expiresAt = Instant.now().plus(Duration.ofSeconds(ttlSeconds));
        response.setHeader(HttpHeaders.CACHE_CONTROL, "private, max-age=" + ttlSeconds);
        response.setHeader(HttpHeaders.PRAGMA, "");
        response.setDateHeader(HttpHeaders.EXPIRES, expiresAt.toEpochMilli());
    }
}
