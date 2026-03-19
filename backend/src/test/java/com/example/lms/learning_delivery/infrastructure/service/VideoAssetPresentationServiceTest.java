package com.example.lms.learning_delivery.infrastructure.service;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoAssetJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoIngestJobJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoRenditionJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoAssetJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoIngestJobJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoRenditionJpaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VideoAssetPresentationServiceTest {

    @Mock
    private VideoAssetJpaRepository videoAssetRepository;

    @Mock
    private VideoIngestJobJpaRepository videoIngestJobRepository;

    @Mock
    private VideoRenditionJpaRepository videoRenditionRepository;

    @InjectMocks
    private VideoAssetPresentationService service;

    @Test
    @DisplayName("asset view prefers grouped offline profiles and reports adaptive source kind")
    void getViewPrefersGroupedProfilesOverOriginal() {
        UUID assetId = UUID.randomUUID();

        VideoAssetJpaEntity asset = VideoAssetJpaEntity.builder()
                .id(assetId)
                .status("READY")
                .adaptivePackagingStatus("READY")
                .hlsManifestStorageKey("video-packages/" + assetId + "/hls/master.m3u8")
                .dashManifestStorageKey("video-packages/" + assetId + "/dash/manifest.mpd")
                .originalFileName("bridge-drill.mp4")
                .sourceFileSize(420_000_000L)
                .durationSeconds(780)
                .width(1920)
                .height(1080)
                .build();

        when(videoAssetRepository.findByIdIn(List.of(assetId))).thenReturn(List.of(asset));
        when(videoIngestJobRepository.findByVideoAssetIdIn(List.of(assetId))).thenReturn(List.of());
        when(videoRenditionRepository.findByVideoAssetIdIn(List.of(assetId))).thenReturn(List.of(
                readyRendition(assetId, "ORIGINAL", "1080p", 420_000_000L, "video-renditions/original.mp4"),
                readyRendition(assetId, "STANDARD", "720p", 180_000_000L, "video-renditions/standard.mp4"),
                readyRendition(assetId, "SAVER", "360p", 70_000_000L, "video-renditions/saver.mp4"),
                readyRendition(assetId, "HIGH", "1080p", 320_000_000L, "video-renditions/high.mp4")
        ));

        Optional<VideoAssetPresentationService.VideoAssetView> view = service.getView(assetId);

        assertThat(view).isPresent();
        assertThat(view.get().videoSourceKind()).isEqualTo("ADAPTIVE_R2");
        assertThat(view.get().adaptivePackagingStatus()).isEqualTo("READY");
        assertThat(view.get().availableOfflineProfiles())
                .extracting(VideoAssetPresentationService.OfflineProfileView::id)
                .containsExactly("SAVER", "STANDARD", "HIGH");
        assertThat(view.get().availableOfflineProfiles())
                .extracting(VideoAssetPresentationService.OfflineProfileView::label)
                .containsExactly("Tiet kiem du lieu", "Chuan", "Chat luong cao");
    }

    @Test
    @DisplayName("offline target falls back from STANDARD to SAVER when STANDARD rendition is unavailable")
    void resolveOfflineTargetFallsBackToSaverBeforeOriginal() {
        UUID assetId = UUID.randomUUID();

        VideoAssetJpaEntity asset = VideoAssetJpaEntity.builder()
                .id(assetId)
                .status("READY")
                .adaptivePackagingStatus("READY")
                .originalFileName("engine-rounds.mp4")
                .sourceFileSize(210_000_000L)
                .build();

        when(videoAssetRepository.findByIdIn(List.of(assetId))).thenReturn(List.of(asset));
        when(videoIngestJobRepository.findByVideoAssetIdIn(List.of(assetId))).thenReturn(List.of());
        when(videoRenditionRepository.findByVideoAssetIdIn(List.of(assetId))).thenReturn(List.of(
                readyRendition(assetId, "ORIGINAL", "720p", 210_000_000L, "video-renditions/original.mp4"),
                readyRendition(assetId, "SAVER", "360p", 68_000_000L, "video-renditions/saver.mp4")
        ));

        Optional<VideoAssetPresentationService.OfflineTargetView> target = service.resolveOfflineTarget(assetId, "STANDARD");

        assertThat(target).isPresent();
        assertThat(target.get().profile()).isEqualTo("SAVER");
        assertThat(target.get().profileLabel()).isEqualTo("Tiet kiem du lieu");
        assertThat(target.get().actualResolution()).isEqualTo("360p");
        assertThat(target.get().storageKey()).isEqualTo("video-renditions/saver.mp4");
    }

    @Test
    @DisplayName("offline target falls back to ORIGINAL when no grouped profile is ready")
    void resolveOfflineTargetFallsBackToOriginal() {
        UUID assetId = UUID.randomUUID();

        VideoAssetJpaEntity asset = VideoAssetJpaEntity.builder()
                .id(assetId)
                .status("READY")
                .adaptivePackagingStatus("READY")
                .originalFileName("mooring-plan.mp4")
                .sourceFileSize(90_000_000L)
                .build();

        when(videoAssetRepository.findByIdIn(List.of(assetId))).thenReturn(List.of(asset));
        when(videoIngestJobRepository.findByVideoAssetIdIn(List.of(assetId))).thenReturn(List.of());
        when(videoRenditionRepository.findByVideoAssetIdIn(List.of(assetId))).thenReturn(List.of(
                readyRendition(assetId, "ORIGINAL", "480p", 90_000_000L, "video-renditions/original.mp4")
        ));

        Optional<VideoAssetPresentationService.OfflineTargetView> target = service.resolveOfflineTarget(assetId, "HIGH");

        assertThat(target).isPresent();
        assertThat(target.get().profile()).isEqualTo("ORIGINAL");
        assertThat(target.get().profileLabel()).isEqualTo("Ban goc");
        assertThat(target.get().actualResolution()).isEqualTo("480p");
        assertThat(target.get().storageKey()).isEqualTo("video-renditions/original.mp4");
    }

    @Test
    @DisplayName("asset view surfaces PROCESSING while ingest job is actively running")
    void getViewShowsProcessingWhenIngestJobIsRunning() {
        UUID assetId = UUID.randomUUID();

        VideoAssetJpaEntity asset = VideoAssetJpaEntity.builder()
                .id(assetId)
                .status("PENDING")
                .adaptivePackagingStatus("PENDING")
                .originalFileName("bridge-watch.mp4")
                .sourceFileSize(150_000_000L)
                .build();

        VideoIngestJobJpaEntity job = VideoIngestJobJpaEntity.builder()
                .videoAssetId(assetId)
                .status("PROCESSING")
                .build();

        when(videoAssetRepository.findByIdIn(List.of(assetId))).thenReturn(List.of(asset));
        when(videoIngestJobRepository.findByVideoAssetIdIn(List.of(assetId))).thenReturn(List.of(job));
        when(videoRenditionRepository.findByVideoAssetIdIn(List.of(assetId))).thenReturn(List.of());

        Optional<VideoAssetPresentationService.VideoAssetView> view = service.getView(assetId);

        assertThat(view).isPresent();
        assertThat(view.get().status()).isEqualTo("PROCESSING");
        assertThat(view.get().adaptivePackagingStatus()).isEqualTo("PROCESSING");
    }

    private VideoRenditionJpaEntity readyRendition(
            UUID assetId,
            String profile,
            String actualResolution,
            Long sizeBytes,
            String storageKey
    ) {
        return VideoRenditionJpaEntity.builder()
                .videoAssetId(assetId)
                .playbackKind("FILE_MP4")
                .profile(profile)
                .actualResolution(actualResolution)
                .fileSizeBytes(sizeBytes)
                .storageKey(storageKey)
                .status("READY")
                .build();
    }
}
