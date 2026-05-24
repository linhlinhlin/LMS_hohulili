package com.example.lms.learning_delivery.infrastructure.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class VideoAssetIngestServiceTest {

    @Test
    @DisplayName("enabledOfflineProfiles keeps valid profiles in configured order")
    void enabledOfflineProfilesKeepsValidProfilesInOrder() {
        VideoAssetIngestService service = newService();
        ReflectionTestUtils.setField(service, "offlineProfiles", "SAVER, STANDARD, invalid, HIGH");

        assertThat(service.enabledOfflineProfiles()).containsExactly("SAVER", "STANDARD", "HIGH");
    }

    @Test
    @DisplayName("enabledOfflineProfiles falls back to full ladder when config is empty or invalid")
    void enabledOfflineProfilesFallsBackToFullLadder() {
        VideoAssetIngestService service = newService();
        ReflectionTestUtils.setField(service, "offlineProfiles", " ");

        assertThat(service.enabledOfflineProfiles()).containsExactlyInAnyOrder("SAVER", "STANDARD", "HIGH");
    }

    private VideoAssetIngestService newService() {
        return new VideoAssetIngestService(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }
}
