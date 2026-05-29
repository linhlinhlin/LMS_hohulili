package com.example.lms.learning_delivery.infrastructure.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VideoPipelineStartupValidatorTest {

    @Test
    @DisplayName("prod startup fails fast when CDN is required but media edge auth is missing")
    void prodStartupFailsWhenRequiredCdnIsMissing() {
        VideoPipelineStartupValidator validator = validator(true, "", "disabled", "", 300, 60);

        assertThatThrownBy(validator::validateProductionVideoPipeline)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("VIDEO_CDN_REQUIRED=true");
    }

    @Test
    @DisplayName("prod startup allows target stack when required CDN settings are present")
    void prodStartupAllowsReadyRequiredCdn() {
        VideoPipelineStartupValidator validator = validator(
                true,
                "https://media.holilihu.online",
                "media_hmac_query",
                "secret",
                300,
                60
        );

        assertThatCode(validator::validateProductionVideoPipeline).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("prod startup fails fast when edge token TTL does not outlive cached manifests")
    void prodStartupFailsWhenEdgeTokenTtlDoesNotOutliveManifestCache() {
        VideoPipelineStartupValidator validator = validator(
                true,
                "https://media.holilihu.online",
                "media_hmac_query",
                "secret",
                60,
                60
        );

        assertThatThrownBy(validator::validateProductionVideoPipeline)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("VIDEO_EDGE_TOKEN_EXPIRY_SECONDS");
    }

    private VideoPipelineStartupValidator validator(
            boolean cdnRequired,
            String mediaDomain,
            String edgeAuthMode,
            String edgeHmacSecret,
            long edgeTokenExpirySeconds,
            long manifestCacheSeconds
    ) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        VideoPipelineStartupValidator validator = new VideoPipelineStartupValidator(environment) {
            @Override
            boolean isShakaPackagerAvailable() {
                return true;
            }
        };
        ReflectionTestUtils.setField(validator, "r2Enabled", true);
        ReflectionTestUtils.setField(validator, "videoCdnRequired", cdnRequired);
        ReflectionTestUtils.setField(validator, "mediaDomain", mediaDomain);
        ReflectionTestUtils.setField(validator, "edgeAuthMode", edgeAuthMode);
        ReflectionTestUtils.setField(validator, "edgeHmacSecret", edgeHmacSecret);
        ReflectionTestUtils.setField(validator, "edgeTokenExpirySeconds", edgeTokenExpirySeconds);
        ReflectionTestUtils.setField(validator, "manifestCacheSeconds", manifestCacheSeconds);
        return validator;
    }
}
