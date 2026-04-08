package com.example.lms.communication.domain.model;

import java.time.Instant;
import java.util.UUID;

/**
 * Domain model for course-wide announcements.
 * Teacher/Admin → all enrolled students.
 */
public class Announcement {

    public enum Priority { NORMAL, IMPORTANT }
    public enum TargetType { COURSE, CLASS, ALL_STUDENTS }

    private final UUID id;
    private final UUID courseId;
    private final UUID authorId;
    private String title;
    private String content;
    private Priority priority;
    private TargetType targetType;
    private final Instant publishedAt;
    private Instant updatedAt;

    private Announcement(UUID id, UUID courseId, UUID authorId, String title, String content,
                          Priority priority, TargetType targetType, Instant publishedAt, Instant updatedAt) {
        this.id = id;
        this.courseId = courseId;
        this.authorId = authorId;
        this.title = title;
        this.content = content;
        this.priority = priority;
        this.targetType = targetType;
        this.publishedAt = publishedAt;
        this.updatedAt = updatedAt;
    }

    public static Announcement create(UUID courseId, UUID authorId, String title, String content,
                                       Priority priority, TargetType targetType) {
        if (title == null || title.isBlank()) throw new IllegalArgumentException("Tiêu đề không được để trống");
        if (content == null || content.isBlank()) throw new IllegalArgumentException("Nội dung không được để trống");
        if (title.length() > 200) throw new IllegalArgumentException("Tiêu đề không quá 200 ký tự");
        if (content.length() > 10000) throw new IllegalArgumentException("Nội dung không quá 10.000 ký tự");

        return new Announcement(
                UUID.randomUUID(), courseId, authorId, title.trim(), content.trim(),
                priority != null ? priority : Priority.NORMAL,
                targetType != null ? targetType : TargetType.COURSE,
                Instant.now(), null
        );
    }

    public static Announcement reconstitute(UUID id, UUID courseId, UUID authorId, String title, String content,
                                              Priority priority, TargetType targetType,
                                              Instant publishedAt, Instant updatedAt) {
        return new Announcement(id, courseId, authorId, title, content, priority, targetType, publishedAt, updatedAt);
    }

    // Getters
    public UUID getId() { return id; }
    public UUID getCourseId() { return courseId; }
    public UUID getAuthorId() { return authorId; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public Priority getPriority() { return priority; }
    public TargetType getTargetType() { return targetType; }
    public Instant getPublishedAt() { return publishedAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void update(String title, String content, Priority priority) {
        if (title != null && !title.isBlank()) this.title = title.trim();
        if (content != null && !content.isBlank()) this.content = content.trim();
        if (priority != null) this.priority = priority;
        this.updatedAt = Instant.now();
    }
}
