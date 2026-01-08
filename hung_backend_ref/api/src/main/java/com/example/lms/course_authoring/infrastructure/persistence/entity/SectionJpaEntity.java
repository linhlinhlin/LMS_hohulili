package com.example.lms.course_authoring.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity for Section persistence.
 */
@Entity
@Table(name = "sections")
public class SectionJpaEntity {
    // Manual boilerplate
    public SectionJpaEntity() {}
    public SectionJpaEntity(UUID id, UUID lessonId, String title, SectionType type, String content, String videoUrl, String fileUrl, Boolean isRequired, Integer duration, Integer orderIndex, Instant createdAt, Instant updatedAt) {
        this.id = id; this.lessonId = lessonId; this.title = title; this.type = type; this.content = content; this.videoUrl = videoUrl; this.fileUrl = fileUrl; this.isRequired = isRequired; this.duration = duration; this.orderIndex = orderIndex; this.createdAt = createdAt; this.updatedAt = updatedAt;
    }
    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private UUID id; private UUID lessonId; private String title; private SectionType type; private String content; private String videoUrl; private String fileUrl; private Boolean isRequired = false; private Integer duration = 0; private Integer orderIndex = 0; private Instant createdAt; private Instant updatedAt;
        public Builder id(UUID id) { this.id = id; return this; }
        public Builder lessonId(UUID lessonId) { this.lessonId = lessonId; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder type(SectionType type) { this.type = type; return this; }
        public Builder content(String content) { this.content = content; return this; }
        public Builder videoUrl(String videoUrl) { this.videoUrl = videoUrl; return this; }
        public Builder fileUrl(String fileUrl) { this.fileUrl = fileUrl; return this; }
        public Builder isRequired(Boolean isRequired) { this.isRequired = isRequired; return this; }
        public Builder duration(Integer duration) { this.duration = duration; return this; }
        public Builder orderIndex(Integer orderIndex) { this.orderIndex = orderIndex; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }
        public SectionJpaEntity build() { return new SectionJpaEntity(id, lessonId, title, type, content, videoUrl, fileUrl, isRequired, duration, orderIndex, createdAt, updatedAt); }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "lesson_id", nullable = false)
    private UUID lessonId;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SectionType type;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "video_url", length = 500)
    private String videoUrl;

    @Column(name = "file_url", length = 500)
    private String fileUrl;

    @Column(name = "is_required", nullable = false)
    private Boolean isRequired = false;

    @Column(name = "duration")
    private Integer duration = 0;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    // Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getLessonId() { return lessonId; }
    public void setLessonId(UUID lessonId) { this.lessonId = lessonId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public SectionType getType() { return type; }
    public void setType(SectionType type) { this.type = type; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }
    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }
    public Boolean getIsRequired() { return isRequired; }
    public void setIsRequired(Boolean isRequired) { this.isRequired = isRequired; }
    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }
    public Integer getOrderIndex() { return orderIndex; }
    public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public enum SectionType {
        VIDEO, TEXT, QUIZ, FILE, ASSIGNMENT
    }
}
