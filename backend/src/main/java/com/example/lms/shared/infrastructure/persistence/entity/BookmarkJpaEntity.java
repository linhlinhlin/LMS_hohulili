package com.example.lms.shared.infrastructure.persistence.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * JPA Entity for Bookmark persistence.
 * Maps to the 'bookmarks' table created by V48__bookmarks.sql.
 */
@Entity
@Table(name = "bookmarks")
public class BookmarkJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "lesson_id")
    private UUID lessonId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, length = 1024)
    private String url;

    @Column(nullable = false)
    private Integer position = 0;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata = new HashMap<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public BookmarkJpaEntity() {}

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID id;
        private UUID userId;
        private UUID courseId;
        private UUID lessonId;
        private String title;
        private String url;
        private Integer position = 0;
        private Map<String, Object> metadata = new HashMap<>();

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder userId(UUID userId) { this.userId = userId; return this; }
        public Builder courseId(UUID courseId) { this.courseId = courseId; return this; }
        public Builder lessonId(UUID lessonId) { this.lessonId = lessonId; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder url(String url) { this.url = url; return this; }
        public Builder position(Integer position) { this.position = position; return this; }
        public Builder metadata(Map<String, Object> metadata) { this.metadata = metadata; return this; }

        public BookmarkJpaEntity build() {
            BookmarkJpaEntity e = new BookmarkJpaEntity();
            e.id = id; e.userId = userId; e.courseId = courseId; e.lessonId = lessonId;
            e.title = title; e.url = url; e.position = position; e.metadata = metadata;
            return e;
        }
    }

    // Getters
    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public UUID getCourseId() { return courseId; }
    public UUID getLessonId() { return lessonId; }
    public String getTitle() { return title; }
    public String getUrl() { return url; }
    public Integer getPosition() { return position; }
    public Map<String, Object> getMetadata() { return metadata; }
    public Instant getCreatedAt() { return createdAt; }

    // Setters for mutable fields
    public void setTitle(String title) { this.title = title; }
    public void setPosition(Integer position) { this.position = position; }
}
