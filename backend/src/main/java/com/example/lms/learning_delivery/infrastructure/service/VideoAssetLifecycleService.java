package com.example.lms.learning_delivery.infrastructure.service;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoAssetJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoIngestJobJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoAssetJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoIngestJobJpaRepository;
import com.example.lms.shared.infrastructure.persistence.entity.FileAttachmentJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.FileAttachmentJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VideoAssetLifecycleService {

    private final VideoAssetJpaRepository videoAssetRepository;
    private final VideoIngestJobJpaRepository videoIngestJobRepository;
    private final FileAttachmentJpaRepository fileAttachmentRepository;

    @Transactional
    public VideoAssetJpaEntity createFromUpload(UUID attachmentId, UserJpaEntity user, String displayName) {
        FileAttachmentJpaEntity attachment = fileAttachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Tệp video upload không tồn tại"));

        verifyAttachmentAccess(attachment, user);

        if (!"VIDEO".equalsIgnoreCase(attachment.getFileCategory())) {
            throw new IllegalArgumentException("Tệp được chọn không thuộc nhóm video");
        }

        return videoAssetRepository.findBySourceAttachmentId(attachmentId)
                .orElseGet(() -> createNewAsset(attachment, user, displayName));
    }

    @Transactional(readOnly = true)
    public VideoAssetJpaEntity requireAccessibleAsset(UUID assetId, UserJpaEntity user) {
        VideoAssetJpaEntity asset = videoAssetRepository.findById(assetId)
                .orElseThrow(() -> new IllegalArgumentException("Video asset không tồn tại"));

        if (!isAdmin(user) && !asset.getOwnerId().equals(user.getId())) {
            throw new AccessDeniedException("Bạn không có quyền truy cập video này");
        }
        return asset;
    }

    @Transactional
    public VideoAssetJpaEntity retry(UUID assetId, UserJpaEntity user) {
        VideoAssetJpaEntity asset = requireAccessibleAsset(assetId, user);
        asset.setStatus("PENDING");
        asset.setAdaptivePackagingStatus("PENDING");
        asset.setErrorMessage(null);
        asset.setAdaptiveErrorMessage(null);
        asset.setProcessingStartedAt(null);
        asset.setProcessedAt(null);
        asset.setAdaptivePackagedAt(null);
        asset.setHlsManifestStorageKey(null);
        asset.setDashManifestStorageKey(null);
        asset.setPlaybackUrl(null);
        asset.setStreamVideoUid(null);
        videoAssetRepository.save(asset);

        VideoIngestJobJpaEntity job = videoIngestJobRepository.findByVideoAssetId(assetId)
                .orElseGet(() -> VideoIngestJobJpaEntity.builder()
                        .videoAssetId(assetId)
                        .build());
        job.setStatus("PENDING");
        job.setLastError(null);
        job.setStartedAt(null);
        job.setFinishedAt(null);
        job.setNextRunAt(Instant.now());
        videoIngestJobRepository.save(job);
        return asset;
    }

    private VideoAssetJpaEntity createNewAsset(FileAttachmentJpaEntity attachment, UserJpaEntity user, String displayName) {
        VideoAssetJpaEntity asset = VideoAssetJpaEntity.builder()
                .ownerId(user.getId())
                .sourceAttachmentId(attachment.getId())
                .sourceStorageKey(attachment.getFileName())
                .sourceFileUrl(attachment.getFileUrl())
                .originalFileName(displayName != null && !displayName.isBlank() ? displayName : attachment.getOriginalName())
                .contentType(attachment.getContentType())
                .sourceFileSize(attachment.getFileSize())
                .sourceKind("INTERNAL_UPLOAD")
                .status("PENDING")
                .build();
        asset = videoAssetRepository.save(asset);

        attachment.setEntityType("VIDEO_ASSET");
        attachment.setEntityId(asset.getId());
        fileAttachmentRepository.save(attachment);

        videoIngestJobRepository.save(VideoIngestJobJpaEntity.builder()
                .videoAssetId(asset.getId())
                .status("PENDING")
                .nextRunAt(Instant.now())
                .build());

        return asset;
    }

    private void verifyAttachmentAccess(FileAttachmentJpaEntity attachment, UserJpaEntity user) {
        if (user == null) {
            throw new AccessDeniedException("Authentication is required");
        }
        if (isAdmin(user)) {
            return;
        }
        if (!attachment.getUploadedBy().equals(user.getId())) {
            throw new AccessDeniedException("Bạn không có quyền dùng tệp upload này");
        }
    }

    private boolean isAdmin(UserJpaEntity user) {
        return user.getRole() == UserJpaEntity.UserRole.ADMIN
                || user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
    }
}
