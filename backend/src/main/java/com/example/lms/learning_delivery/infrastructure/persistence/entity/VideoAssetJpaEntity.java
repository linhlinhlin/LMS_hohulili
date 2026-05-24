package com.example.lms.learning_delivery.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "video_assets")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoAssetJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "source_attachment_id", nullable = false)
    private UUID sourceAttachmentId;

    @Column(name = "source_storage_key", nullable = false, length = 500)
    private String sourceStorageKey;

    @Column(name = "source_file_url", nullable = false, columnDefinition = "TEXT")
    private String sourceFileUrl;

    @Column(name = "original_file_name", nullable = false, length = 500)
    private String originalFileName;

    @Column(name = "content_type", nullable = false, length = 150)
    private String contentType;

    @Column(name = "source_file_size", nullable = false)
    private Long sourceFileSize;

    @Column(name = "source_kind", nullable = false, length = 50)
    @Builder.Default
    private String sourceKind = "INTERNAL_UPLOAD";

    @Column(name = "content_sha256", length = 64)
    private String contentSha256;

    @Column(name = "content_fingerprint_status", nullable = false, length = 30)
    @Builder.Default
    private String contentFingerprintStatus = "PENDING";

    @Column(name = "duplicate_of_asset_id")
    private UUID duplicateOfAssetId;

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "stream_video_uid", length = 255)
    private String streamVideoUid;

    @Column(name = "playback_url", columnDefinition = "TEXT")
    private String playbackUrl;

    @Column(name = "adaptive_packaging_status", nullable = false, length = 30)
    @Builder.Default
    private String adaptivePackagingStatus = "PENDING";

    @Column(name = "hls_manifest_storage_key", length = 500)
    private String hlsManifestStorageKey;

    @Column(name = "dash_manifest_storage_key", length = 500)
    private String dashManifestStorageKey;

    @Column(name = "package_size_bytes")
    private Long packageSizeBytes;

    @Column(name = "storage_state", nullable = false, length = 30)
    @Builder.Default
    private String storageState = "ACTIVE";

    @Column(name = "storage_deleted_at")
    private Instant storageDeletedAt;

    @Column(name = "source_retained", nullable = false)
    @Builder.Default
    private Boolean sourceRetained = true;

    @Column(name = "adaptive_packaged_at")
    private Instant adaptivePackagedAt;

    @Column(name = "adaptive_error_message", columnDefinition = "TEXT")
    private String adaptiveErrorMessage;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "width")
    private Integer width;

    @Column(name = "height")
    private Integer height;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "processing_started_at")
    private Instant processingStartedAt;

    @Column(name = "processed_at")
    private Instant processedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
