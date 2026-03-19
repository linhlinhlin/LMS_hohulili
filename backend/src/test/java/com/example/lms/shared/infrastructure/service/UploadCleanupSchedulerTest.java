package com.example.lms.shared.infrastructure.service;

import com.example.lms.shared.infrastructure.persistence.entity.UploadSessionJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.FileAttachmentJpaRepository;
import com.example.lms.shared.infrastructure.persistence.repository.UploadSessionJpaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UploadCleanupSchedulerTest {

    @Mock
    private UploadSessionJpaRepository uploadSessionJpaRepository;

    @Mock
    private FileAttachmentJpaRepository fileAttachmentJpaRepository;

    @Mock
    private R2StorageService r2StorageService;

    @Mock
    private R2VideoStorageService r2VideoStorageService;

    @Mock
    private LocalStorageService localStorageService;

    @Test
    @DisplayName("expired multipart video sessions abort the multipart upload")
    void expirePendingSessionsAbortsMultipartVideoSessions() {
        UploadCleanupScheduler scheduler = new UploadCleanupScheduler(
                uploadSessionJpaRepository,
                fileAttachmentJpaRepository,
                r2StorageService,
                r2VideoStorageService,
                localStorageService
        );
        UploadSessionJpaEntity session = UploadSessionJpaEntity.builder()
                .id(UUID.randomUUID())
                .storageKey("videos/huge.mp4")
                .userId(UUID.randomUUID())
                .contentType("video/mp4")
                .declaredSize(1_000_000_000L)
                .folder("videos")
                .status("PENDING")
                .uploadStrategy("MULTIPART")
                .multipartUploadId("upload-123")
                .expiresAt(Instant.now().minusSeconds(7200))
                .build();

        when(uploadSessionJpaRepository.findByStatusAndExpiresAtBefore(org.mockito.ArgumentMatchers.eq("PENDING"), org.mockito.ArgumentMatchers.any(Instant.class)))
                .thenReturn(List.of(session));

        scheduler.expirePendingSessions();

        verify(r2VideoStorageService).abortMultipartUpload("videos/huge.mp4", "upload-123");
        ArgumentCaptor<List<UploadSessionJpaEntity>> savedCaptor = ArgumentCaptor.forClass(List.class);
        verify(uploadSessionJpaRepository).saveAll(savedCaptor.capture());
        assertThat(savedCaptor.getValue().getFirst().getStatus()).isEqualTo("EXPIRED");
    }
}
