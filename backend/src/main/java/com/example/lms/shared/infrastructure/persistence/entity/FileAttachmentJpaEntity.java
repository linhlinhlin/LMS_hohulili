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

    @Column(name = "entity_type")  // Nullable in DB
    private String entityType;

    @Column(name = "entity_id")  // Nullable in DB
    private UUID entityId;

    @Column(name = "file_category", nullable = false)
    private String fileCategory;

    @Column(name = "status")
    private String status;

    @Column(name = "stored_filename", nullable = false)  // Actual DB column name
    private String fileName;

    @Column(name = "original_filename", nullable = false)  // Actual DB column name
    private String originalName;

    @Column(name = "storage_path", nullable = false, length = 255)  // Actual DB column name
    private String fileUrl;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "content_type", length = 100, nullable = false)
    private String contentType;

    @Column(name = "uploaded_by", nullable = false)
    private UUID uploadedBy;

    @CreationTimestamp
    @Column(name = "uploaded_at", updatable = false)
    private Instant uploadedAt;
}
