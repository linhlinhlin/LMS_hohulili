package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "file_attachments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "entity_id")
    private UUID entityId; // ID của Section, User, Course...

    @Column(name = "entity_type", nullable = false)
    private String entityType; // Ví dụ: "SECTION_MATERIAL", "USER_AVATAR"

    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    @Column(name = "stored_filename", nullable = false, unique = true)
    private String storedFilename;

    @Column(name = "storage_path", nullable = false)
    private String storagePath; // Đường dẫn file (S3 key hoặc local path)

    @Column(name = "content_type")
    private String contentType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "file_category")
    @Enumerated(EnumType.STRING)
    private FileCategory fileCategory; // DOCUMENT, IMAGE, VIDEO...

    @Column(nullable = false)
    private String status; // UPLOADING, AVAILABLE, DELETED

    @Column(name = "uploaded_by", nullable = false)
    private UUID uploadedBy;

    @CreationTimestamp
    @Column(name = "uploaded_at", updatable = false)
    private LocalDateTime uploadedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // Enum nội bộ hoặc tách ra file riêng
    public enum FileCategory {
        DOCUMENT, IMAGE, VIDEO, AUDIO, ARCHIVE, OTHER
    }
}
