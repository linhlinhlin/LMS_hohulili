package com.example.lms.learning_delivery.infrastructure.service;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoAssetJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoIngestJobJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoAssetJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoIngestJobClaimRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoIngestJobJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoRenditionJpaRepository;
import com.example.lms.shared.infrastructure.persistence.entity.FileAttachmentJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.FileAttachmentJpaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationContext;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.util.StopWatch;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class VideoAssetIngestServiceTest {

    @Mock
    private VideoAssetJpaRepository videoAssetRepository;
    @Mock
    private VideoIngestJobJpaRepository videoIngestJobRepository;
    @Mock
    private VideoIngestJobClaimRepository videoIngestJobClaimRepository;
    @Mock
    private VideoRenditionJpaRepository videoRenditionRepository;
    @Mock
    private FileAttachmentJpaRepository fileAttachmentRepository;
    @Mock
    private VideoBinaryStorageService videoBinaryStorageService;
    @Mock
    private FfmpegVideoProcessingService ffmpegVideoProcessingService;
    @Mock
    private ShakaPackagerService shakaPackagerService;
    @Mock
    private ApplicationContext applicationContext;

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

    @Test
    @DisplayName("adaptive profiles are configured independently from offline profiles")
    void adaptiveProfilesAreIndependentFromOfflineProfiles() {
        VideoAssetIngestService service = newService();
        ReflectionTestUtils.setField(service, "offlineProfiles", "SAVER,STANDARD");
        ReflectionTestUtils.setField(service, "adaptiveProfiles", "SAVER,STANDARD,HIGH");
        FileAttachmentJpaEntity source = FileAttachmentJpaEntity.builder()
                .fileSize(10_000L)
                .contentType("video/mp4")
                .build();
        FfmpegVideoProcessingService.VideoProbe probe = new FfmpegVideoProcessingService.VideoProbe(
                1920,
                1080,
                60,
                true,
                30.0
        );

        List<?> offlineSpecs = ReflectionTestUtils.invokeMethod(
                service,
                "buildRenditionSpecs",
                source,
                probe,
                service.enabledOfflineProfiles()
        );
        List<?> adaptiveSpecs = ReflectionTestUtils.invokeMethod(
                service,
                "buildRenditionSpecs",
                source,
                probe,
                service.enabledAdaptiveProfiles()
        );

        assertThat(profiles(offlineSpecs)).containsExactly("SAVER", "STANDARD");
        assertThat(profiles(adaptiveSpecs)).containsExactly("SAVER", "STANDARD", "HIGH");
    }

    @Test
    @DisplayName("duplicate ingest applies source retention policy")
    void duplicateIngestDiscardsSourceWhenRetentionDisabled() {
        VideoAssetIngestService service = newService();
        UUID assetId = UUID.randomUUID();
        UUID canonicalId = UUID.randomUUID();
        VideoAssetJpaEntity duplicate = VideoAssetJpaEntity.builder()
                .id(assetId)
                .sourceStorageKey("videos/" + assetId + ".mp4")
                .sourceRetained(true)
                .build();
        VideoAssetJpaEntity canonical = VideoAssetJpaEntity.builder()
                .id(canonicalId)
                .status("READY")
                .adaptivePackagingStatus("READY")
                .hlsManifestStorageKey("video-packages/" + canonicalId + "/hls/master.m3u8")
                .dashManifestStorageKey("video-packages/" + canonicalId + "/dash/manifest.mpd")
                .packageSizeBytes(123L)
                .build();
        VideoIngestJobJpaEntity job = VideoIngestJobJpaEntity.builder()
                .id(UUID.randomUUID())
                .videoAssetId(assetId)
                .build();
        ReflectionTestUtils.setField(service, "retainSourceAfterReady", false);
        when(videoRenditionRepository.findByVideoAssetId(canonicalId)).thenReturn(List.of());

        ReflectionTestUtils.invokeMethod(service, "completeAsDuplicate", job, duplicate, canonical, new StopWatch());

        assertThat(duplicate.getDuplicateOfAssetId()).isEqualTo(canonicalId);
        assertThat(duplicate.getSourceRetained()).isFalse();
        assertThat(duplicate.getStatus()).isEqualTo("READY");
        verify(videoBinaryStorageService).delete("videos/" + assetId + ".mp4");
        verify(videoAssetRepository).save(duplicate);
        verify(videoIngestJobRepository).save(job);
    }

    @Test
    @DisplayName("duplicate ingest keeps source when retention is enabled")
    void duplicateIngestKeepsSourceWhenRetentionEnabled() {
        VideoAssetIngestService service = newService();
        UUID assetId = UUID.randomUUID();
        UUID canonicalId = UUID.randomUUID();
        VideoAssetJpaEntity duplicate = VideoAssetJpaEntity.builder()
                .id(assetId)
                .sourceStorageKey("videos/" + assetId + ".mp4")
                .sourceRetained(true)
                .build();
        VideoAssetJpaEntity canonical = VideoAssetJpaEntity.builder()
                .id(canonicalId)
                .status("READY")
                .adaptivePackagingStatus("READY")
                .build();
        VideoIngestJobJpaEntity job = VideoIngestJobJpaEntity.builder()
                .id(UUID.randomUUID())
                .videoAssetId(assetId)
                .build();
        ReflectionTestUtils.setField(service, "retainSourceAfterReady", true);
        when(videoRenditionRepository.findByVideoAssetId(canonicalId)).thenReturn(List.of());

        ReflectionTestUtils.invokeMethod(service, "completeAsDuplicate", job, duplicate, canonical, new StopWatch());

        assertThat(duplicate.getSourceRetained()).isTrue();
        verify(videoBinaryStorageService, never()).delete("videos/" + assetId + ".mp4");
    }

    private VideoAssetIngestService newService() {
        return new VideoAssetIngestService(
                videoAssetRepository,
                videoIngestJobRepository,
                videoIngestJobClaimRepository,
                videoRenditionRepository,
                fileAttachmentRepository,
                videoBinaryStorageService,
                ffmpegVideoProcessingService,
                shakaPackagerService,
                applicationContext
        );
    }

    private List<String> profiles(List<?> specs) {
        return specs.stream()
                .map(spec -> (String) ReflectionTestUtils.invokeMethod(spec, "profile"))
                .toList();
    }
}
