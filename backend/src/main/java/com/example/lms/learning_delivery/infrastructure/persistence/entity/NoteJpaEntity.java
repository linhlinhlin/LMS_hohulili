package com.example.lms.learning_delivery.infrastructure.persistence.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "student_notes")
public class NoteJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "lesson_id")
    private UUID lessonId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "TEXT[]")
    private String[] tags;

    @Column(name = "is_public")
    private boolean isPublic;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public NoteJpaEntity() {}

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID id;
        private UUID userId;
        private UUID courseId;
        private UUID lessonId;
        private String title;
        private String content;
        private String[] tags;
        private boolean isPublic;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder userId(UUID userId) { this.userId = userId; return this; }
        public Builder courseId(UUID courseId) { this.courseId = courseId; return this; }
        public Builder lessonId(UUID lessonId) { this.lessonId = lessonId; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder content(String content) { this.content = content; return this; }
        public Builder tags(String[] tags) { this.tags = tags; return this; }
        public Builder isPublic(boolean isPublic) { this.isPublic = isPublic; return this; }

        public NoteJpaEntity build() {
            NoteJpaEntity e = new NoteJpaEntity();
            e.id = id;
            e.userId = userId;
            e.courseId = courseId;
            e.lessonId = lessonId;
            e.title = title;
            e.content = content;
            e.tags = tags;
            e.isPublic = isPublic;
            return e;
        }
    }

    // Getters
    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public UUID getCourseId() { return courseId; }
    public UUID getLessonId() { return lessonId; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public String[] getTags() { return tags; }
    public boolean isPublic() { return isPublic; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    // Setters for mutable fields
    public void setTitle(String title) { this.title = title; }
    public void setContent(String content) { this.content = content; }
    public void setTags(String[] tags) { this.tags = tags; }
}
