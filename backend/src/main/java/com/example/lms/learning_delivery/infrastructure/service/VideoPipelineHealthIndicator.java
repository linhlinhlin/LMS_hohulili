package com.example.lms.learning_delivery.infrastructure.service;

import com.example.lms.shared.infrastructure.service.LocalStorageService;
import com.example.lms.shared.infrastructure.service.R2VideoStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Arrays;
import java.util.Optional;

@Component("videoPipeline")
@RequiredArgsConstructor
public class VideoPipelineHealthIndicator implements HealthIndicator {

    private final Environment environment;
    private final Optional<R2VideoStorageService> r2VideoStorageService;
    private final Optional<LocalStorageService> localStorageService;

    @Override
    public Health health() {
        boolean productionProfile = Arrays.stream(environment.getActiveProfiles())
                .anyMatch("prod"::equalsIgnoreCase);
        boolean r2Enabled = Boolean.parseBoolean(environment.getProperty("cloudflare.r2.enabled", "false"));
        boolean privateVideoStorageReady = r2VideoStorageService.isPresent();
        boolean localFallbackAvailable = localStorageService.isPresent();
        boolean shakaAvailable = isShakaPackagerAvailable();
        boolean targetStackReady = r2Enabled && privateVideoStorageReady && shakaAvailable;
        boolean mediaDomainConfigured = hasText(environment.getProperty("app.video.media-domain", ""));
        String edgeAuthMode = environment.getProperty("app.video.edge-auth-mode", "disabled");
        String edgeHmacSecret = environment.getProperty("app.video.edge-hmac-secret", "");
        long edgeTokenExpirySeconds = longProperty("app.video.edge-token-expiry-seconds", 300L);
        boolean edgeAuthConfigured = VideoPlaybackDeliveryPolicy.isMediaDomainEdgeAuthEnabled(
                edgeAuthMode,
                edgeHmacSecret,
                edgeTokenExpirySeconds
        );
        boolean cdnSegmentDeliveryReady = mediaDomainConfigured && edgeAuthConfigured;
        long manifestCacheSeconds = longProperty("app.video.manifest-cache-seconds", 60L);
        long objectRedirectCacheSeconds = longProperty("app.video.object-redirect-cache-seconds", 30L);
        long segmentPresignTtlSeconds = longProperty("app.video.segment-presign-ttl-seconds", 120L);
        long effectiveManifestCacheSeconds = VideoPlaybackDeliveryPolicy.effectiveManifestCacheSeconds(
                manifestCacheSeconds,
                edgeAuthConfigured,
                edgeTokenExpirySeconds
        );
        long effectiveObjectRedirectCacheSeconds = VideoPlaybackDeliveryPolicy.effectiveObjectRedirectCacheSeconds(
                objectRedirectCacheSeconds,
                segmentPresignTtlSeconds
        );

        Health.Builder builder = (privateVideoStorageReady || localFallbackAvailable) && shakaAvailable
                ? Health.up()
                : Health.down();

        return builder
                .withDetail("profile", productionProfile ? "prod" : "non-prod")
                .withDetail("targetStackReady", targetStackReady)
                .withDetail("teacherUploadPath", "presigned-upload -> /api/v3/video-assets/from-upload -> save section/course intro with videoAssetId")
                .withDetail("onlinePlayback", shakaAvailable ? "R2 + Shaka adaptive playback" : "Unavailable")
                .withDetail("cdnDeliveryMode", cdnSegmentDeliveryReady
                        ? "Custom media domain + edge HMAC segment delivery"
                        : "Backend-mediated tokenized manifest/object path")
                .withDetail("cdnSegmentDeliveryReady", cdnSegmentDeliveryReady)
                .withDetail("mediaDomainConfigured", mediaDomainConfigured)
                .withDetail("edgeAuthConfigured", edgeAuthConfigured)
                .withDetail("edgeTokenExpirySeconds", edgeTokenExpirySeconds)
                .withDetail("manifestCacheSeconds", manifestCacheSeconds)
                .withDetail("effectiveManifestCacheSeconds", effectiveManifestCacheSeconds)
                .withDetail("objectRedirectCacheSeconds", objectRedirectCacheSeconds)
                .withDetail("effectiveObjectRedirectCacheSeconds", effectiveObjectRedirectCacheSeconds)
                .withDetail("adaptiveSegmentDurationSeconds", longProperty("app.video.adaptive-segment-duration-seconds", 6L))
                .withDetail("binaryStorage", privateVideoStorageReady
                        ? "R2 private video bucket"
                        : localFallbackAvailable
                        ? "Local filesystem fallback"
                        : "Unavailable")
                .withDetail("r2Enabled", r2Enabled)
                .withDetail("privateVideoStorageReady", privateVideoStorageReady)
                .withDetail("shakaAvailable", shakaAvailable)
                .withDetail("localFallbackAvailable", localFallbackAvailable)
                .build();
    }

    private long longProperty(String key, long fallback) {
        String raw = environment.getProperty(key);
        if (raw == null || raw.isBlank()) {
            return fallback;
        }
        try {
            return Long.parseLong(raw.trim());
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
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
}
