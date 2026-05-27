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
        VideoPipelineStartupValidator validator = validator(true, "", "disabled", "", 300);

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
                300
        );

        assertThatCode(validator::validateProductionVideoPipeline).doesNotThrowAnyException();
    }

    private VideoPipelineStartupValidator validator(
            boolean cdnRequired,
            String mediaDomain,
            String edgeAuthMode,
            String edgeHmacSecret,
            long edgeTokenExpirySeconds
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
        return validator;
    }
}
