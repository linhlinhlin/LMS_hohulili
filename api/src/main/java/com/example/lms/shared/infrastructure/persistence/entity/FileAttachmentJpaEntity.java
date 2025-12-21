package com.example.lms.shared.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity for FileAttachment persistence.
 */
@Entity
@Table(name = "file_attachments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileAttachmentJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "original_name", nullable = false)
    private String originalName;

    @Column(name = "file_url", nullable = false, length = 500)
    private String fileUrl;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "content_type", length = 100)
    private String contentType;

    @Column(name = "uploaded_by")
    private UUID uploadedBy;

    @CreationTimestamp
    @Column(name = "uploaded_at", updatable = false)
    private Instant uploadedAt;
}
