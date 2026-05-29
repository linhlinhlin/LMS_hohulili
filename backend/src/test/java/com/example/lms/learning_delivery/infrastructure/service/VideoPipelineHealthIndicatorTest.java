package com.example.lms.learning_delivery.infrastructure.service;

import com.example.lms.shared.infrastructure.service.LocalStorageService;
import com.example.lms.shared.infrastructure.service.R2VideoStorageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.actuate.health.Health;
import org.springframework.core.env.Environment;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class VideoPipelineHealthIndicatorTest {

    @Test
    @DisplayName("health reports target stack ready when R2 private storage and Shaka are available")
    void healthReportsTargetStackReady() {
        Environment environment = mock(Environment.class);
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});
        when(environment.getProperty("cloudflare.r2.enabled", "false")).thenReturn("true");
        when(environment.getProperty("app.video.cdn-required", "false")).thenReturn("true");
        when(environment.getProperty("app.video.media-domain", "")).thenReturn("https://media.holilihu.online");
        when(environment.getProperty("app.video.edge-auth-mode", "disabled")).thenReturn("media_hmac_query");
        when(environment.getProperty("app.video.edge-hmac-secret", "")).thenReturn("secret");
        when(environment.getProperty("app.video.edge-token-expiry-seconds")).thenReturn("300");
        when(environment.getProperty("app.video.manifest-cache-seconds")).thenReturn("60");
        when(environment.getProperty("app.video.object-redirect-cache-seconds")).thenReturn("30");
        when(environment.getProperty("app.video.adaptive-segment-duration-seconds")).thenReturn("6");

        VideoPipelineHealthIndicator indicator = new VideoPipelineHealthIndicator(
                environment,
                Optional.of(mock(R2VideoStorageService.class)),
                Optional.empty()
        ) {
            @Override
            boolean isShakaPackagerAvailable() {
                return true;
            }
        };

        Health health = indicator.health();

        assertThat(health.getStatus().getCode()).isEqualTo("UP");
        assertThat(health.getDetails())
                .containsEntry("profile", "prod")
                .containsEntry("targetStackReady", true)
                .containsEntry("cdnRequired", true)
                .containsEntry("cdnSegmentDeliveryReady", true)
                .containsEntry("edgeTokenFreshEnough", true)
                .containsEntry("edgeTokenExpirySeconds", 300L)
                .containsEntry("cdnDeliveryMode", "Custom media domain + edge HMAC segment delivery")
                .containsEntry("onlinePlayback", "R2 + Shaka adaptive playback")
                .containsEntry("binaryStorage", "R2 private video bucket");
    }

    @Test
    @DisplayName("health reports local fallback when target stack is not fully enabled")
    void healthReportsLocalFallback() {
        Environment environment = mock(Environment.class);
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});
        when(environment.getProperty("cloudflare.r2.enabled", "false")).thenReturn("false");
        when(environment.getProperty("app.video.cdn-required", "false")).thenReturn("false");
        when(environment.getProperty("app.video.media-domain", "")).thenReturn("");
        when(environment.getProperty("app.video.edge-auth-mode", "disabled")).thenReturn("disabled");
        when(environment.getProperty("app.video.edge-hmac-secret", "")).thenReturn("");

        VideoPipelineHealthIndicator indicator = new VideoPipelineHealthIndicator(
                environment,
                Optional.empty(),
                Optional.of(mock(LocalStorageService.class))
        ) {
            @Override
            boolean isShakaPackagerAvailable() {
                return true;
            }
        };

        Health health = indicator.health();

        assertThat(health.getStatus().getCode()).isEqualTo("UP");
        assertThat(health.getDetails())
                .containsEntry("targetStackReady", false)
                .containsEntry("cdnSegmentDeliveryReady", false)
                .containsEntry("cdnDeliveryMode", "Backend-mediated tokenized manifest/object path")
                .containsEntry("onlinePlayback", "R2 + Shaka adaptive playback")
                .containsEntry("binaryStorage", "Local filesystem fallback")
                .containsEntry("localFallbackAvailable", true);
    }

    @Test
    @DisplayName("health is down when CDN segment delivery is required but edge auth is missing")
    void healthDownWhenRequiredCdnIsMissing() {
        Environment environment = mock(Environment.class);
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});
        when(environment.getProperty("cloudflare.r2.enabled", "false")).thenReturn("true");
        when(environment.getProperty("app.video.cdn-required", "false")).thenReturn("true");
        when(environment.getProperty("app.video.media-domain", "")).thenReturn("");
        when(environment.getProperty("app.video.edge-auth-mode", "disabled")).thenReturn("disabled");
        when(environment.getProperty("app.video.edge-hmac-secret", "")).thenReturn("");

        VideoPipelineHealthIndicator indicator = new VideoPipelineHealthIndicator(
                environment,
                Optional.of(mock(R2VideoStorageService.class)),
                Optional.empty()
        ) {
            @Override
            boolean isShakaPackagerAvailable() {
                return true;
            }
        };

        Health health = indicator.health();

        assertThat(health.getStatus().getCode()).isEqualTo("DOWN");
        assertThat(health.getDetails())
                .containsEntry("targetStackReady", true)
                .containsEntry("cdnRequired", true)
                .containsEntry("cdnSegmentDeliveryReady", false)
                .containsEntry("cdnDeliveryMode", "Backend-mediated tokenized manifest/object path");
    }

    @Test
    @DisplayName("health is down when required CDN tokens do not outlive cached manifests")
    void healthDownWhenRequiredCdnTokenTtlDoesNotOutliveManifestCache() {
        Environment environment = mock(Environment.class);
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});
        when(environment.getProperty("cloudflare.r2.enabled", "false")).thenReturn("true");
        when(environment.getProperty("app.video.cdn-required", "false")).thenReturn("true");
        when(environment.getProperty("app.video.media-domain", "")).thenReturn("https://media.holilihu.online");
        when(environment.getProperty("app.video.edge-auth-mode", "disabled")).thenReturn("media_hmac_query");
        when(environment.getProperty("app.video.edge-hmac-secret", "")).thenReturn("secret");
        when(environment.getProperty("app.video.edge-token-expiry-seconds")).thenReturn("60");
        when(environment.getProperty("app.video.manifest-cache-seconds")).thenReturn("60");
        when(environment.getProperty("app.video.object-redirect-cache-seconds")).thenReturn("30");

        VideoPipelineHealthIndicator indicator = new VideoPipelineHealthIndicator(
                environment,
                Optional.of(mock(R2VideoStorageService.class)),
                Optional.empty()
        ) {
            @Override
            boolean isShakaPackagerAvailable() {
                return true;
            }
        };

        Health health = indicator.health();

        assertThat(health.getStatus().getCode()).isEqualTo("DOWN");
        assertThat(health.getDetails())
                .containsEntry("edgeAuthConfigured", true)
                .containsEntry("edgeTokenFreshEnough", false)
                .containsEntry("cdnSegmentDeliveryReady", false)
                .containsEntry("cdnDeliveryMode", "Backend-mediated tokenized manifest/object path");
    }
}
