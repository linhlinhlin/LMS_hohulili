package com.example.lms.learning_delivery.infrastructure.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Locale;

@Component
@Slf4j
public class VideoPipelineStartupValidator {

    private final Environment environment;

    @Value("${cloudflare.r2.enabled:false}")
    private boolean r2Enabled;

    @Value("${app.video.cdn-required:false}")
    private boolean videoCdnRequired;

    @Value("${app.video.media-domain:}")
    private String mediaDomain;

    @Value("${app.video.edge-auth-mode:disabled}")
    private String edgeAuthMode;

    @Value("${app.video.edge-hmac-secret:}")
    private String edgeHmacSecret;

    @Value("${app.video.edge-token-expiry-seconds:300}")
    private long edgeTokenExpirySeconds;

    @Value("${app.video.manifest-cache-seconds:60}")
    private long manifestCacheSeconds;

    public VideoPipelineStartupValidator(Environment environment) {
        this.environment = environment;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void validateProductionVideoPipeline() {
        if (!environment.acceptsProfiles(Profiles.of("prod"))) {
            return;
        }

        boolean shakaAvailable = isShakaPackagerAvailable();
        boolean cdnReady = isCdnSegmentDeliveryReady();
        if (videoCdnRequired && !cdnReady) {
            throw new IllegalStateException(
                    "VIDEO_CDN_REQUIRED=true but media-domain edge auth is not ready. " +
                            "Set VIDEO_MEDIA_DOMAIN, VIDEO_EDGE_AUTH_MODE=media_hmac_query, VIDEO_EDGE_HMAC_SECRET, " +
                            "and keep VIDEO_EDGE_TOKEN_EXPIRY_SECONDS greater than VIDEO_MANIFEST_CACHE_SECONDS."
            );
        }

        if (r2Enabled && shakaAvailable) {
            log.info("[VideoPipeline] Production video stack ready: R2 private storage + Shaka Packager. CDN segment delivery required={}, ready={}.",
                    videoCdnRequired,
                    cdnReady
            );
            return;
        }

        log.warn(
                "[VideoPipeline] Production is not on the target video stack. Expected R2 + Shaka Packager, but current config is R2={}, Shaka={}. Uploads may still work, but adaptive playback will not be fully available until both are ready.",
                r2Enabled,
                shakaAvailable
        );
    }

    boolean isShakaPackagerAvailable() {
        try {
            Process process = new ProcessBuilder("packager", "--version")
                    .redirectErrorStream(true)
                    .start();
            int exitCode = process.waitFor();
            return exitCode == 0;
        } catch (IOException ex) {
            return false;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    private boolean isCdnSegmentDeliveryReady() {
        return hasText(mediaDomain)
                && "media_hmac_query".equals(normalizeEdgeAuthMode(edgeAuthMode))
                && hasText(edgeHmacSecret)
                && edgeTokenExpirySeconds > effectiveManifestCacheSeconds();
    }

    private long effectiveManifestCacheSeconds() {
        return Math.max(10L, manifestCacheSeconds);
    }

    private String normalizeEdgeAuthMode(String mode) {
        String normalized = mode == null ? "" : mode.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "media_hmac_query", "query_hmac", "hmac_query", "waf_hmac_query", "worker_hmac_query" ->
                    "media_hmac_query";
            default -> "disabled";
        };
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
