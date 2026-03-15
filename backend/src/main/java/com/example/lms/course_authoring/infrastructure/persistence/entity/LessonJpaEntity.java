package com.example.lms.course_authoring.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.example.lms.shared.domain.model.ContentBlock;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * JPA Entity for Lesson persistence.
 */
@Entity
@Table(name = "lessons")
public class LessonJpaEntity {
    // Manual boilerplate
    public LessonJpaEntity() {}
    public LessonJpaEntity(UUID id, UUID chapterId, String title, String description, LessonType type, String videoUrl, Integer durationMinutes, Integer orderIndex, Boolean isFree, Instant createdAt, Instant updatedAt, List<ContentBlock> contentBlocks, String streamVideoUid) {
        this.id = id; this.chapterId = chapterId; this.title = title; this.description = description; this.type = type; this.videoUrl = videoUrl; this.durationMinutes = durationMinutes; this.orderIndex = orderIndex; this.isFree = isFree; this.createdAt = createdAt; this.updatedAt = updatedAt; this.contentBlocks = contentBlocks; this.streamVideoUid = streamVideoUid;
    }
    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private UUID id; private UUID chapterId; private String title; private String description; private LessonType type = LessonType.VIDEO; private String videoUrl; private Integer durationMinutes = 0; private Integer orderIndex = 0; private Boolean isFree = false; private Instant createdAt; private Instant updatedAt; private List<ContentBlock> contentBlocks = new ArrayList<>(); private String streamVideoUid;
        public Builder id(UUID id) { this.id = id; return this; }
        public Builder chapterId(UUID chapterId) { this.chapterId = chapterId; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder type(LessonType type) { this.type = type; return this; }
        public Builder videoUrl(String videoUrl) { this.videoUrl = videoUrl; return this; }
        public Builder durationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; return this; }
        public Builder orderIndex(Integer orderIndex) { this.orderIndex = orderIndex; return this; }
        public Builder isFree(Boolean isFree) { this.isFree = isFree; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }
        public Builder contentBlocks(List<ContentBlock> contentBlocks) { this.contentBlocks = contentBlocks; return this; }
        public Builder streamVideoUid(String streamVideoUid) { this.streamVideoUid = streamVideoUid; return this; }
        public LessonJpaEntity build() { return new LessonJpaEntity(id, chapterId, title, description, type, videoUrl, durationMinutes, orderIndex, isFree, createdAt, updatedAt, contentBlocks, streamVideoUid); }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "chapter_id", nullable = false)
    private UUID chapterId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "lesson_type")
    private LessonType type = LessonType.VIDEO;

    @Column(name = "video_url", length = 500)
    private String videoUrl;

    @Column(name = "duration_minutes")
    private Integer durationMinutes = 0;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex = 0;

    @Column(name = "is_free")
    private Boolean isFree = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private List<ContentBlock> contentBlocks = new ArrayList<>();

    @Column(name = "stream_video_uid")
    private String streamVideoUid;

    // Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getChapterId() { return chapterId; }
    public void setChapterId(UUID chapterId) { this.chapterId = chapterId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LessonType getType() { return type; }
    public void setType(LessonType type) { this.type = type; }
    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }
    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }
    public Integer getOrderIndex() { return orderIndex; }
    public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    public Boolean getIsFree() { return isFree; }
    public void setIsFree(Boolean isFree) { this.isFree = isFree; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public List<ContentBlock> getContentBlocks() { return contentBlocks; }
    public void setContentBlocks(List<ContentBlock> contentBlocks) { this.contentBlocks = contentBlocks; }
    public String getStreamVideoUid() { return streamVideoUid; }
    public void setStreamVideoUid(String streamVideoUid) { this.streamVideoUid = streamVideoUid; }

    public enum LessonType {
        VIDEO, TEXT, QUIZ, ASSIGNMENT, LECTURE
    }
}
