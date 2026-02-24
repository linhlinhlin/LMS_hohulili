package com.example.lms.shared.domain.model;

import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Pure domain model for Bookmark.
 * Represents a user's bookmark to a specific course/lesson location.
 * Canvas-style bookmarks: each bookmark has a title, URL, optional position, and metadata.
 */
public class Bookmark {

    private UUID id;
    private UUID userId;
    private UUID courseId;
    private UUID lessonId;
    private String title;
    private String url;
    private int position;
    private Map<String, Object> metadata;
    private Instant createdAt;

    protected Bookmark() {}

    /**
     * Factory method for creating a new bookmark.
     */
    public static Bookmark create(UUID userId, UUID courseId, UUID lessonId,
                                   String title, String url, int position,
                                   Map<String, Object> metadata) {
        Objects.requireNonNull(userId, "userId không được để trống");
        Objects.requireNonNull(courseId, "courseId không được để trống");
        Objects.requireNonNull(title, "Tiêu đề không được để trống");
        Objects.requireNonNull(url, "URL không được để trống");

        Bookmark bookmark = new Bookmark();
        bookmark.id = UUID.randomUUID();
        bookmark.userId = userId;
        bookmark.courseId = courseId;
        bookmark.lessonId = lessonId;
        bookmark.title = title;
        bookmark.url = url;
        bookmark.position = position;
        bookmark.metadata = metadata != null
                ? Collections.unmodifiableMap(new HashMap<>(metadata))
                : Collections.emptyMap();
        bookmark.createdAt = Instant.now();
        return bookmark;
    }

    /**
     * Reconstitute from persistence layer.
     */
    public static Bookmark reconstitute(UUID id, UUID userId, UUID courseId, UUID lessonId,
                                         String title, String url, int position,
                                         Map<String, Object> metadata, Instant createdAt) {
        Bookmark bookmark = new Bookmark();
        bookmark.id = id;
        bookmark.userId = userId;
        bookmark.courseId = courseId;
        bookmark.lessonId = lessonId;
        bookmark.title = title;
        bookmark.url = url;
        bookmark.position = position;
        bookmark.metadata = metadata != null
                ? Collections.unmodifiableMap(new HashMap<>(metadata))
                : Collections.emptyMap();
        bookmark.createdAt = createdAt;
        return bookmark;
    }

    /**
     * Update mutable fields.
     */
    public void update(String title, int position) {
        Objects.requireNonNull(title, "Tiêu đề không được để trống");
        this.title = title;
        this.position = position;
    }

    // Getters
    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public UUID getCourseId() { return courseId; }
    public UUID getLessonId() { return lessonId; }
    public String getTitle() { return title; }
    public String getUrl() { return url; }
    public int getPosition() { return position; }
    public Map<String, Object> getMetadata() { return metadata; }
    public Instant getCreatedAt() { return createdAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Bookmark bookmark = (Bookmark) o;
        return Objects.equals(id, bookmark.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Bookmark{id=" + id + ", title='" + title + "', url='" + url + "'}";
    }
}
