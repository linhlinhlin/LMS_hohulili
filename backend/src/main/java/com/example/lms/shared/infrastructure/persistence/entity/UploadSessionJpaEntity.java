package com.example.lms.shared.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "upload_sessions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadSessionJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "storage_key", nullable = false, length = 500)
    private String storageKey;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "declared_size", nullable = false)
    private Long declaredSize;

    @Column(name = "folder", nullable = false, length = 100)
    private String folder;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "upload_strategy", nullable = false, length = 20)
    @Builder.Default
    private String uploadStrategy = "SINGLE_PUT";

    @Column(name = "multipart_upload_id", columnDefinition = "text")
    private String multipartUploadId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "multipart_completed_at")
    private Instant multipartCompletedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;
}
