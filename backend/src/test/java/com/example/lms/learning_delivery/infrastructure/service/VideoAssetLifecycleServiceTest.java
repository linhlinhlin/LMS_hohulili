package com.example.lms.learning_delivery.infrastructure.service;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoAssetJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoIngestJobJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoAssetJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoIngestJobJpaRepository;
import com.example.lms.shared.infrastructure.persistence.entity.FileAttachmentJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.FileAttachmentJpaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VideoAssetLifecycleServiceTest {

    @Mock
    private VideoAssetJpaRepository videoAssetRepository;

    @Mock
    private VideoIngestJobJpaRepository videoIngestJobRepository;

    @Mock
    private FileAttachmentJpaRepository fileAttachmentRepository;

    @InjectMocks
    private VideoAssetLifecycleService service;

    @Test
    @DisplayName("createFromUpload creates pending asset, tags attachment, and enqueues ingest job")
    void createFromUploadCreatesAssetAndJob() {
        UUID attachmentId = UUID.randomUUID();
        UUID assetId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        FileAttachmentJpaEntity attachment = FileAttachmentJpaEntity.builder()
                .id(attachmentId)
                .fileCategory("VIDEO")
                .fileName("videos/source/master.mp4")
                .originalName("master.mp4")
                .fileUrl("https://files.example.com/master.mp4")
                .fileSize(164_000_000L)
                .contentType("video/mp4")
                .uploadedBy(userId)
                .build();

        UserJpaEntity user = UserJpaEntity.builder()
                .id(userId)
                .role(UserJpaEntity.UserRole.TEACHER)
                .build();

        when(fileAttachmentRepository.findById(attachmentId)).thenReturn(Optional.of(attachment));
        when(videoAssetRepository.findBySourceAttachmentId(attachmentId)).thenReturn(Optional.empty());
        when(videoAssetRepository.save(any(VideoAssetJpaEntity.class))).thenAnswer(invocation -> {
            VideoAssetJpaEntity asset = invocation.getArgument(0);
            asset.setId(assetId);
            return asset;
        });
        when(fileAttachmentRepository.save(any(FileAttachmentJpaEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(videoIngestJobRepository.save(any(VideoIngestJobJpaEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        VideoAssetJpaEntity asset = service.createFromUpload(attachmentId, user, "Video an toàn hàng hải");

        assertThat(asset.getId()).isEqualTo(assetId);
        assertThat(asset.getStatus()).isEqualTo("PENDING");
        assertThat(asset.getOwnerId()).isEqualTo(userId);
        assertThat(asset.getSourceAttachmentId()).isEqualTo(attachmentId);
        assertThat(asset.getSourceStorageKey()).isEqualTo("videos/source/master.mp4");
        assertThat(asset.getOriginalFileName()).isEqualTo("Video an toàn hàng hải");

        ArgumentCaptor<FileAttachmentJpaEntity> attachmentCaptor = ArgumentCaptor.forClass(FileAttachmentJpaEntity.class);
        verify(fileAttachmentRepository).save(attachmentCaptor.capture());
        assertThat(attachmentCaptor.getValue().getEntityType()).isEqualTo("VIDEO_ASSET");
        assertThat(attachmentCaptor.getValue().getEntityId()).isEqualTo(assetId);

        ArgumentCaptor<VideoIngestJobJpaEntity> jobCaptor = ArgumentCaptor.forClass(VideoIngestJobJpaEntity.class);
        verify(videoIngestJobRepository).save(jobCaptor.capture());
        assertThat(jobCaptor.getValue().getVideoAssetId()).isEqualTo(assetId);
        assertThat(jobCaptor.getValue().getStatus()).isEqualTo("PENDING");
        assertThat(jobCaptor.getValue().getNextRunAt()).isNotNull();
    }

    @Test
    @DisplayName("createFromUpload reuses existing asset for the same attachment")
    void createFromUploadReusesExistingAsset() {
        UUID attachmentId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        FileAttachmentJpaEntity attachment = FileAttachmentJpaEntity.builder()
                .id(attachmentId)
                .fileCategory("VIDEO")
                .fileName("videos/source/master.mp4")
                .originalName("master.mp4")
                .fileUrl("https://files.example.com/master.mp4")
                .fileSize(164_000_000L)
                .contentType("video/mp4")
                .uploadedBy(userId)
                .build();

        VideoAssetJpaEntity existingAsset = VideoAssetJpaEntity.builder()
                .id(UUID.randomUUID())
                .ownerId(userId)
                .sourceAttachmentId(attachmentId)
                .status("READY")
                .build();

        UserJpaEntity user = UserJpaEntity.builder()
                .id(userId)
                .role(UserJpaEntity.UserRole.TEACHER)
                .build();

        when(fileAttachmentRepository.findById(attachmentId)).thenReturn(Optional.of(attachment));
        when(videoAssetRepository.findBySourceAttachmentId(attachmentId)).thenReturn(Optional.of(existingAsset));

        VideoAssetJpaEntity result = service.createFromUpload(attachmentId, user, "Master");

        assertThat(result).isSameAs(existingAsset);
        verify(videoAssetRepository, never()).save(any(VideoAssetJpaEntity.class));
        verify(videoIngestJobRepository, never()).save(any(VideoIngestJobJpaEntity.class));
        verify(fileAttachmentRepository, never()).save(any(FileAttachmentJpaEntity.class));
    }

    @Test
    @DisplayName("retry resets failed asset and requeues ingest job")
    void retryResetsAssetAndJobState() {
        UUID assetId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();

        VideoAssetJpaEntity asset = VideoAssetJpaEntity.builder()
                .id(assetId)
                .ownerId(ownerId)
                .status("FAILED")
                .errorMessage("ffmpeg exited with code 1")
                .processingStartedAt(Instant.now().minusSeconds(120))
                .processedAt(Instant.now().minusSeconds(60))
                .build();

        VideoIngestJobJpaEntity job = VideoIngestJobJpaEntity.builder()
                .id(UUID.randomUUID())
                .videoAssetId(assetId)
                .status("FAILED")
                .attemptCount(2)
                .lastError("ffmpeg exited with code 1")
                .startedAt(Instant.now().minusSeconds(120))
                .finishedAt(Instant.now().minusSeconds(60))
                .nextRunAt(Instant.now().minusSeconds(30))
                .build();

        UserJpaEntity user = UserJpaEntity.builder()
                .id(ownerId)
                .role(UserJpaEntity.UserRole.TEACHER)
                .build();

        when(videoAssetRepository.findById(assetId)).thenReturn(Optional.of(asset));
        when(videoIngestJobRepository.findByVideoAssetId(assetId)).thenReturn(Optional.of(job));
        when(videoAssetRepository.save(any(VideoAssetJpaEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(videoIngestJobRepository.save(any(VideoIngestJobJpaEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        VideoAssetJpaEntity retried = service.retry(assetId, user);

        assertThat(retried.getStatus()).isEqualTo("PENDING");
        assertThat(retried.getErrorMessage()).isNull();
        assertThat(retried.getProcessingStartedAt()).isNull();
        assertThat(retried.getProcessedAt()).isNull();

        assertThat(job.getStatus()).isEqualTo("PENDING");
        assertThat(job.getLastError()).isNull();
        assertThat(job.getStartedAt()).isNull();
        assertThat(job.getFinishedAt()).isNull();
        assertThat(job.getNextRunAt()).isAfter(Instant.now().minusSeconds(5));
    }
}
