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
                .containsEntry("onlinePlayback", "R2 + Shaka adaptive playback")
                .containsEntry("binaryStorage", "R2 private video bucket");
    }

    @Test
    @DisplayName("health reports local fallback when target stack is not fully enabled")
    void healthReportsLocalFallback() {
        Environment environment = mock(Environment.class);
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});
        when(environment.getProperty("cloudflare.r2.enabled", "false")).thenReturn("false");

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
                .containsEntry("onlinePlayback", "R2 + Shaka adaptive playback")
                .containsEntry("binaryStorage", "Local filesystem fallback")
                .containsEntry("localFallbackAvailable", true);
    }
}
