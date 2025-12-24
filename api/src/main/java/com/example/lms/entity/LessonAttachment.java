package com.example.lms.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "lesson_attachments")
public class LessonAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "original_file_name", nullable = false)
    private String originalFileName;

    @Column(name = "file_url", nullable = false)
    private String fileUrl;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(name = "file_type", nullable = false)
    private String fileType; // document, presentation, spreadsheet, video, audio, other

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by")
    private User uploadedBy;

    @CreationTimestamp
    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private Instant uploadedAt;

    public LessonAttachment() {}

    public LessonAttachment(UUID id, Lesson lesson, String fileName, String originalFileName, String fileUrl, Long fileSize, String contentType, String fileType, Integer displayOrder, User uploadedBy, Instant uploadedAt) {
        this.id = id;
        this.lesson = lesson;
        this.fileName = fileName;
        this.originalFileName = originalFileName;
        this.fileUrl = fileUrl;
        this.fileSize = fileSize;
        this.contentType = contentType;
        this.fileType = fileType;
        this.displayOrder = displayOrder != null ? displayOrder : 0;
        this.uploadedBy = uploadedBy;
        this.uploadedAt = uploadedAt;
    }

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Lesson getLesson() { return lesson; }
    public void setLesson(Lesson lesson) { this.lesson = lesson; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getOriginalFileName() { return originalFileName; }
    public void setOriginalFileName(String originalFileName) { this.originalFileName = originalFileName; }
    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }
    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }
    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
    public User getUploadedBy() { return uploadedBy; }
    public void setUploadedBy(User uploadedBy) { this.uploadedBy = uploadedBy; }
    public Instant getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(Instant uploadedAt) { this.uploadedAt = uploadedAt; }

    // Helper methods
    public boolean isDocument() { return "document".equals(fileType); }
    public boolean isPresentation() { return "presentation".equals(fileType); }
    public boolean isSpreadsheet() { return "spreadsheet".equals(fileType); }
    public boolean isVideo() { return "video".equals(fileType); }
    public boolean isAudio() { return "audio".equals(fileType); }

    public String getFileExtension() {
        if (originalFileName != null && originalFileName.contains(".")) {
            return originalFileName.substring(originalFileName.lastIndexOf(".") + 1).toLowerCase();
        }
        return "";
    }

    // Manual Builder
    public static LessonAttachmentBuilder builder() { return new LessonAttachmentBuilder(); }
    public static class LessonAttachmentBuilder {
        private LessonAttachment a = new LessonAttachment();
        public LessonAttachmentBuilder id(UUID i) { a.setId(i); return this; }
        public LessonAttachmentBuilder lesson(Lesson l) { a.setLesson(l); return this; }
        public LessonAttachmentBuilder fileName(String f) { a.setFileName(f); return this; }
        public LessonAttachmentBuilder originalFileName(String o) { a.setOriginalFileName(o); return this; }
        public LessonAttachmentBuilder fileUrl(String f) { a.setFileUrl(f); return this; }
        public LessonAttachmentBuilder fileSize(Long s) { a.setFileSize(s); return this; }
        public LessonAttachmentBuilder contentType(String c) { a.setContentType(c); return this; }
        public LessonAttachmentBuilder fileType(String t) { a.setFileType(t); return this; }
        public LessonAttachmentBuilder displayOrder(Integer d) { a.setDisplayOrder(d); return this; }
        public LessonAttachmentBuilder uploadedBy(User u) { a.setUploadedBy(u); return this; }
        public LessonAttachmentBuilder uploadedAt(Instant t) { a.setUploadedAt(t); return this; }
        public LessonAttachment build() { return a; }
    }
}
