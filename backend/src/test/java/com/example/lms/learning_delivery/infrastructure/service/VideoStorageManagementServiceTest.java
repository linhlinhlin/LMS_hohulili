package com.example.lms.learning_delivery.infrastructure.service;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoAssetJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoRenditionJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoAssetJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoRenditionJpaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VideoStorageManagementServiceTest {

    @Mock
    private VideoAssetJpaRepository videoAssetRepository;
    @Mock
    private VideoRenditionJpaRepository videoRenditionRepository;
    @Mock
    private VideoBinaryStorageService videoBinaryStorageService;
    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private VideoStorageManagementService service;

    @Test
    @DisplayName("storage report accounts retained source, renditions, packages, duplicates, and references")
    void storageReportAccountsRetainedBytes() {
        UUID referencedId = UUID.randomUUID();
        UUID duplicateId = UUID.randomUUID();
        VideoAssetJpaEntity referenced = asset(referencedId, "referenced.mp4", 100, 40, null);
        VideoAssetJpaEntity duplicate = asset(duplicateId, "duplicate.mp4", 100, 0, referencedId);
        VideoAssetJpaEntity deleted = asset(UUID.randomUUID(), "deleted.mp4", 1_000, 500, null);
        deleted.setStorageState("DELETED");

        when(videoAssetRepository.findAll()).thenReturn(List.of(referenced, duplicate, deleted));
        when(videoRenditionRepository.findByVideoAssetIdIn(List.of(referenced.getId(), duplicate.getId(), deleted.getId())))
                .thenReturn(List.of(
                        rendition(referencedId, "STANDARD", 60, "video-renditions/" + referencedId + "/standard.mp4"),
                        rendition(duplicateId, "STANDARD", 60, "video-renditions/" + referencedId + "/standard.mp4")
                ));
        when(videoAssetRepository.findByDuplicateOfAssetId(any(UUID.class))).thenReturn(List.of());
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class), any()))
                .thenAnswer(invocation -> invocation.getArgument(2).toString().contains(referencedId.toString()) ? 1L : 0L);

        VideoStorageManagementService.VideoStorageReport report = service.getStorageReport(10);

        assertThat(report.totalAssets()).isEqualTo(3);
        assertThat(report.referencedAssets()).isEqualTo(1);
        assertThat(report.duplicateAssets()).isEqualTo(1);
        assertThat(report.sourceBytes()).isEqualTo(200);
        assertThat(report.renditionBytes()).isEqualTo(60);
        assertThat(report.packageBytes()).isEqualTo(40);
        assertThat(report.estimatedTotalBytes()).isEqualTo(300);
        assertThat(report.duplicateSourceBytes()).isEqualTo(100);
        assertThat(report.topAssets()).extracting(VideoStorageManagementService.VideoAssetStorageView::assetId)
                .containsExactly(referencedId, duplicateId);
    }

    @Test
    @DisplayName("orphan cleanup dry-run reports candidates without deleting storage")
    void cleanupDryRunDoesNotDeleteStorage() {
        UUID orphanId = UUID.randomUUID();
        VideoAssetJpaEntity orphan = asset(orphanId, "orphan.mp4", 100, 40, null);
        orphan.setUpdatedAt(Instant.now().minusSeconds(30L * 24L * 60L * 60L));

        when(videoAssetRepository.findAll()).thenReturn(List.of(orphan));
        when(videoAssetRepository.findByDuplicateOfAssetId(orphanId)).thenReturn(List.of());
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class), any())).thenReturn(0L);

        VideoStorageManagementService.VideoCleanupResult result = service.cleanupOrphanedAssets(true, 14, 10);

        assertThat(result.dryRun()).isTrue();
        assertThat(result.candidateCount()).isEqualTo(1);
        assertThat(result.candidates()).singleElement()
                .extracting(VideoStorageManagementService.CleanupCandidate::assetId)
                .isEqualTo(orphanId);
        verify(videoBinaryStorageService, never()).delete(ArgumentMatchers.anyString());
        verify(videoRenditionRepository, never()).deleteByVideoAssetId(any(UUID.class));
    }

    @Test
    @DisplayName("orphan cleanup deletes only unreferenced retained storage when dryRun is false")
    void cleanupDeletesUnreferencedStorage() {
        UUID orphanId = UUID.randomUUID();
        VideoAssetJpaEntity orphan = asset(orphanId, "orphan.mp4", 100, 40, null);
        orphan.setUpdatedAt(Instant.now().minusSeconds(30L * 24L * 60L * 60L));

        when(videoAssetRepository.findAll()).thenReturn(List.of(orphan));
        when(videoAssetRepository.findByDuplicateOfAssetId(orphanId)).thenReturn(List.of());
        when(videoRenditionRepository.findByVideoAssetId(orphanId)).thenReturn(List.of(
                rendition(orphanId, "STANDARD", 60, "video-renditions/" + orphanId + "/standard.mp4")
        ));
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class), any())).thenReturn(0L);
        when(videoBinaryStorageService.deletePrefix("video-packages/" + orphanId + "/")).thenReturn(3);
        when(videoAssetRepository.save(any(VideoAssetJpaEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        VideoStorageManagementService.VideoCleanupResult result = service.cleanupOrphanedAssets(false, 14, 10);

        assertThat(result.dryRun()).isFalse();
        assertThat(result.candidateCount()).isEqualTo(1);
        assertThat(result.reclaimedBytes()).isEqualTo(200);
        assertThat(result.deletedObjects()).isEqualTo(5);
        assertThat(orphan.getStorageState()).isEqualTo("DELETED");
        assertThat(orphan.getSourceRetained()).isFalse();
        verify(videoBinaryStorageService).delete("videos/" + orphanId + ".mp4");
        verify(videoBinaryStorageService).delete("video-renditions/" + orphanId + "/standard.mp4");
        verify(videoRenditionRepository).deleteByVideoAssetId(orphanId);
    }

    @Test
    @DisplayName("orphan cleanup for duplicate assets deletes only duplicate source storage")
    void cleanupDuplicateDeletesOnlyDuplicateSourceStorage() {
        UUID canonicalId = UUID.randomUUID();
        UUID duplicateId = UUID.randomUUID();
        VideoAssetJpaEntity duplicate = asset(duplicateId, "duplicate.mp4", 100, 40, canonicalId);
        duplicate.setUpdatedAt(Instant.now().minusSeconds(30L * 24L * 60L * 60L));

        when(videoAssetRepository.findAll()).thenReturn(List.of(duplicate));
        when(videoAssetRepository.findByDuplicateOfAssetId(duplicateId)).thenReturn(List.of());
        when(videoRenditionRepository.findByVideoAssetId(duplicateId)).thenReturn(List.of(
                rendition(duplicateId, "STANDARD", 60, "video-renditions/" + canonicalId + "/standard.mp4")
        ));
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class), any())).thenReturn(0L);
        when(videoBinaryStorageService.deletePrefix("video-packages/" + duplicateId + "/")).thenReturn(0);
        when(videoAssetRepository.save(any(VideoAssetJpaEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        VideoStorageManagementService.VideoCleanupResult result = service.cleanupOrphanedAssets(false, 14, 10);

        assertThat(result.reclaimedBytes()).isEqualTo(100);
        assertThat(result.deletedObjects()).isEqualTo(1);
        assertThat(result.candidates()).singleElement()
                .extracting(VideoStorageManagementService.CleanupCandidate::packageBytes)
                .isEqualTo(0L);
        verify(videoBinaryStorageService).delete("videos/" + duplicateId + ".mp4");
        verify(videoBinaryStorageService, never()).delete("video-renditions/" + canonicalId + "/standard.mp4");
        verify(videoBinaryStorageService).deletePrefix("video-packages/" + duplicateId + "/");
        verify(videoBinaryStorageService, never()).deletePrefix("video-packages/" + canonicalId + "/");
        verify(videoRenditionRepository).deleteByVideoAssetId(duplicateId);
    }

    private VideoAssetJpaEntity asset(UUID id, String name, long sourceBytes, long packageBytes, UUID duplicateOfAssetId) {
        return VideoAssetJpaEntity.builder()
                .id(id)
                .ownerId(UUID.randomUUID())
                .sourceAttachmentId(UUID.randomUUID())
                .sourceStorageKey("videos/" + id + ".mp4")
                .sourceFileUrl("video-private://videos/" + id + ".mp4")
                .originalFileName(name)
                .contentType("video/mp4")
                .sourceFileSize(sourceBytes)
                .sourceRetained(true)
                .duplicateOfAssetId(duplicateOfAssetId)
                .status("READY")
                .adaptivePackagingStatus("READY")
                .storageState("ACTIVE")
                .packageSizeBytes(packageBytes)
                .createdAt(Instant.now().minusSeconds(40L * 24L * 60L * 60L))
                .updatedAt(Instant.now().minusSeconds(20L * 24L * 60L * 60L))
                .build();
    }

    private VideoRenditionJpaEntity rendition(UUID assetId, String profile, long bytes, String storageKey) {
        return VideoRenditionJpaEntity.builder()
                .videoAssetId(assetId)
                .profile(profile)
                .playbackKind("FILE_MP4")
                .fileSizeBytes(bytes)
                .storageKey(storageKey)
                .status("READY")
                .build();
    }
}
