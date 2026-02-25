package com.example.lms.learning_delivery.domain.model;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Note Domain Model - Student notes for course learning.
 * Pure domain model following Clean Architecture (no JPA annotations).
 */
public class Note {

    private UUID id;
    private UUID userId;
    private UUID courseId;
    private UUID lessonId;
    private String title;
    private String content;
    private List<String> tags;
    private boolean isPublic;
    private Instant createdAt;
    private Instant updatedAt;

    protected Note() {}

    public static Note create(UUID userId, UUID courseId, UUID lessonId, String title, String content, List<String> tags) {
        Objects.requireNonNull(userId, "Mã người dùng không được để trống");
        Objects.requireNonNull(courseId, "Mã khóa học không được để trống");
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Tiêu đề ghi chú không được để trống");
        }

        Note note = new Note();
        note.id = UUID.randomUUID();
        note.userId = userId;
        note.courseId = courseId;
        note.lessonId = lessonId;
        note.title = title;
        note.content = content != null ? content : "";
        note.tags = tags != null ? List.copyOf(tags) : List.of();
        note.isPublic = false;
        note.createdAt = Instant.now();
        note.updatedAt = Instant.now();
        return note;
    }

    public static Note reconstitute(UUID id, UUID userId, UUID courseId, UUID lessonId,
                                     String title, String content, List<String> tags,
                                     boolean isPublic, Instant createdAt, Instant updatedAt) {
        Note note = new Note();
        note.id = id;
        note.userId = userId;
        note.courseId = courseId;
        note.lessonId = lessonId;
        note.title = title;
        note.content = content;
        note.tags = tags != null ? List.copyOf(tags) : List.of();
        note.isPublic = isPublic;
        note.createdAt = createdAt;
        note.updatedAt = updatedAt;
        return note;
    }

    public void update(String title, String content, List<String> tags) {
        if (title != null && !title.isBlank()) {
            this.title = title;
        }
        if (content != null) {
            this.content = content;
        }
        if (tags != null) {
            this.tags = List.copyOf(tags);
        }
        this.updatedAt = Instant.now();
    }

    public boolean isOwnedBy(UUID userId) {
        return this.userId.equals(userId);
    }

    // Getters
    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public UUID getCourseId() { return courseId; }
    public UUID getLessonId() { return lessonId; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public List<String> getTags() { return tags; }
    public boolean isPublic() { return isPublic; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Note note)) return false;
        return Objects.equals(id, note.id);
    }

    @Override
    public int hashCode() { return Objects.hash(id); }
}
