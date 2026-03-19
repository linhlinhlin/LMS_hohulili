package com.example.lms.learning_delivery.infrastructure.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class ShakaPackagerServiceTest {

    private final ShakaPackagerService service = new ShakaPackagerService();

    @Test
    @DisplayName("resolveSegmentDurationSeconds falls back to a safe default")
    void resolveSegmentDurationSecondsFallsBackToDefault() {
        ReflectionTestUtils.setField(service, "segmentDurationSeconds", 0);

        assertThat(service.resolveSegmentDurationSeconds()).isEqualTo(6);
    }

    @Test
    @DisplayName("resolveSegmentDurationSeconds keeps valid configured values")
    void resolveSegmentDurationSecondsKeepsConfiguredValue() {
        ReflectionTestUtils.setField(service, "segmentDurationSeconds", 8);

        assertThat(service.resolveSegmentDurationSeconds()).isEqualTo(8);
    }
}
