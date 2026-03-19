package com.example.lms.learning_delivery.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "video_renditions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoRenditionJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "video_asset_id", nullable = false)
    private UUID videoAssetId;

    @Column(name = "playback_kind", nullable = false, length = 30)
    private String playbackKind;

    @Column(name = "profile", nullable = false, length = 30)
    private String profile;

    @Column(name = "actual_resolution", length = 30)
    private String actualResolution;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @Column(name = "storage_key", length = 500)
    private String storageKey;

    @Column(name = "file_url", columnDefinition = "TEXT")
    private String fileUrl;

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "PROCESSING";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
