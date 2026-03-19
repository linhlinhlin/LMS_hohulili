package com.example.lms.shared.infrastructure.service;

import com.example.lms.shared.infrastructure.persistence.repository.FileAttachmentJpaRepository;
import com.example.lms.shared.infrastructure.persistence.entity.UploadSessionJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.UploadSessionJpaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PresignedUploadUseCaseTest {

    @Mock
    private R2VideoStorageService r2VideoStorageService;

    @Mock
    private UploadSessionJpaRepository uploadSessionJpaRepository;

    @Mock
    private FileAttachmentJpaRepository fileAttachmentJpaRepository;

    @Test
    @DisplayName("video presigned uploads allow files up to 5 GB via multipart")
    void initUploadAllowsVideoFilesUpToFiveGigabytes() {
        PresignedUploadUseCase useCase = new PresignedUploadUseCase(
                null,
                null,
                r2VideoStorageService,
                uploadSessionJpaRepository,
                fileAttachmentJpaRepository
        );
        when(r2VideoStorageService.initiateMultipartUpload(anyString(), anyString()))
                .thenReturn(new R2VideoStorageService.MultipartUploadSession("videos/huge.mp4", "upload-5gb"));

        PresignedUploadUseCase.InitUploadResult result = useCase.initUpload(
                "video/mp4",
                5_000_000_000L,
                "videos",
                UUID.randomUUID()
        );

        assertThat(result.uploadStrategy()).isEqualTo("MULTIPART");
        assertThat(result.multipartUploadId()).isEqualTo("upload-5gb");
        assertThat(result.uploadUrl()).isNull();
        assertThat(result.storageKey()).endsWith(".mp4");
        assertThat(result.isServerRelay()).isFalse();
    }

    @Test
    @DisplayName("video presigned uploads accept AVI and MKV content types")
    void initUploadAcceptsAviAndMatroska() {
        PresignedUploadUseCase useCase = new PresignedUploadUseCase(
                null,
                null,
                r2VideoStorageService,
                uploadSessionJpaRepository,
                fileAttachmentJpaRepository
        );
        when(r2VideoStorageService.presignPut(anyString(), anyString(), anyLong(), any(Duration.class)))
                .thenReturn("https://example.com/upload");

        PresignedUploadUseCase.InitUploadResult aviResult = useCase.initUpload(
                "video/x-msvideo",
                123_456L,
                "videos",
                UUID.randomUUID()
        );
        PresignedUploadUseCase.InitUploadResult mkvResult = useCase.initUpload(
                "video/x-matroska",
                123_456L,
                "videos",
                UUID.randomUUID()
        );

        assertThat(aviResult.storageKey()).endsWith(".avi");
        assertThat(mkvResult.storageKey()).endsWith(".mkv");
    }

    @Test
    @DisplayName("video presigned uploads reject files larger than 5 GB")
    void initUploadRejectsFilesLargerThanFiveGigabytes() {
        PresignedUploadUseCase useCase = new PresignedUploadUseCase(
                null,
                null,
                r2VideoStorageService,
                uploadSessionJpaRepository,
                fileAttachmentJpaRepository
        );

        assertThatThrownBy(() -> useCase.initUpload(
                "video/mp4",
                5_000_000_001L,
                "videos",
                UUID.randomUUID()
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("5 GB");
    }

    @Test
    @DisplayName("large video uploads switch to multipart strategy")
    void initUploadUsesMultipartForLargeVideos() {
        PresignedUploadUseCase useCase = new PresignedUploadUseCase(
                null,
                null,
                r2VideoStorageService,
                uploadSessionJpaRepository,
                fileAttachmentJpaRepository
        );
        when(r2VideoStorageService.initiateMultipartUpload(anyString(), anyString()))
                .thenReturn(new R2VideoStorageService.MultipartUploadSession("videos/demo.mp4", "upload-123"));

        PresignedUploadUseCase.InitUploadResult result = useCase.initUpload(
                "video/mp4",
                250_000_000L,
                "videos",
                UUID.randomUUID()
        );

        assertThat(result.uploadStrategy()).isEqualTo("MULTIPART");
        assertThat(result.uploadUrl()).isNull();
        assertThat(result.multipartUploadId()).isEqualTo("upload-123");
        assertThat(result.multipartPartSizeBytes()).isPositive();
    }

    @Test
    @DisplayName("multipart part URLs require a matching upload session")
    void createMultipartPartUrlRequiresMatchingSession() {
        PresignedUploadUseCase useCase = new PresignedUploadUseCase(
                null,
                null,
                r2VideoStorageService,
                uploadSessionJpaRepository,
                fileAttachmentJpaRepository
        );
        UUID userId = UUID.randomUUID();
        UploadSessionJpaEntity session = UploadSessionJpaEntity.builder()
                .storageKey("videos/example.mp4")
                .userId(userId)
                .contentType("video/mp4")
                .declaredSize(250_000_000L)
                .folder("videos")
                .status("PENDING")
                .uploadStrategy("MULTIPART")
                .multipartUploadId("upload-123")
                .expiresAt(Instant.now().plusSeconds(60))
                .build();

        when(uploadSessionJpaRepository.findByStorageKeyAndUserIdAndStatus(
                "videos/example.mp4",
                userId,
                "PENDING"
        )).thenReturn(Optional.of(session));
        when(r2VideoStorageService.presignUploadPart(eq("videos/example.mp4"), eq("upload-123"), eq(1), any(Duration.class)))
                .thenReturn("https://example.com/part-1");

        PresignedUploadUseCase.MultipartPartUrlResult result = useCase.createMultipartPartUrl(
                "videos/example.mp4",
                "upload-123",
                1,
                userId
        );

        assertThat(result.uploadUrl()).isEqualTo("https://example.com/part-1");
        verify(r2VideoStorageService).presignUploadPart(eq("videos/example.mp4"), eq("upload-123"), eq(1), any(Duration.class));
    }
}
