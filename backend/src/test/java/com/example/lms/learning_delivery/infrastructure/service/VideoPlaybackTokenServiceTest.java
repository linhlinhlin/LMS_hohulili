package com.example.lms.learning_delivery.infrastructure.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class VideoPlaybackTokenServiceTest {

    private final VideoPlaybackTokenService service = new VideoPlaybackTokenService();

    @Test
    @DisplayName("edge auth mode normalizes known aliases and disables unknown values")
    void normalizeEdgeAuthModeSupportsAliases() {
        assertThat(service.normalizeEdgeAuthMode("media_hmac_query")).isEqualTo("media_hmac_query");
        assertThat(service.normalizeEdgeAuthMode("worker_hmac_query")).isEqualTo("media_hmac_query");
        assertThat(service.normalizeEdgeAuthMode("query_hmac")).isEqualTo("media_hmac_query");
        assertThat(service.normalizeEdgeAuthMode("invalid")).isEqualTo("disabled");
    }

    @Test
    @DisplayName("mintEdgeObjectToken uses Cloudflare-compatible timestamp-base64mac format")
    void mintEdgeObjectTokenUsesTimestampAndBase64Mac() {
        ReflectionTestUtils.setField(service, "edgeAuthMode", "media_hmac_query");
        ReflectionTestUtils.setField(service, "edgeHmacSecret", "mysecrettoken");
        ReflectionTestUtils.setField(service, "edgeTokenExpirySeconds", 300L);

        String token = service.mintEdgeObjectToken("/video-packages/asset-1/hls/segment1.m4s", 1_700_000_000L);

        assertThat(token).startsWith("1700000000-");
        String mac = token.substring(token.indexOf('-') + 1);
        assertThat(Base64.getDecoder().decode(mac)).isNotEmpty();
    }
}
