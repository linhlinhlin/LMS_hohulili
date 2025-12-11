package com.example.lms.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for lesson progress information
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LessonProgressResponse {

    /**
     * Progress record ID
     */
    private UUID id;

    /**
     * Lesson ID
     */
    private UUID lessonId;

    /**
     * Current progress status
     */
    private String status;

    /**
     * Whether the lesson is completed
     */
    private boolean isCompleted;

    /**
     * When the student started the lesson
     */
    private Instant startedAt;

    /**
     * When the lesson was completed
     */
    private Instant completedAt;

    /**
     * Time spent on lesson in minutes (optional)
     */
    private Integer timeSpentMinutes;

    public LessonProgressResponse() {}

    public LessonProgressResponse(UUID id, UUID lessonId, String status, boolean isCompleted, Instant startedAt, Instant completedAt, Integer timeSpentMinutes) {
        this.id = id;
        this.lessonId = lessonId;
        this.status = status;
        this.isCompleted = isCompleted;
        this.startedAt = startedAt;
        this.completedAt = completedAt;
        this.timeSpentMinutes = timeSpentMinutes;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getLessonId() { return lessonId; }
    public void setLessonId(UUID lessonId) { this.lessonId = lessonId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public boolean getIsCompleted() { return isCompleted; }
    public void setIsCompleted(boolean isCompleted) { this.isCompleted = isCompleted; }
    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
    public Integer getTimeSpentMinutes() { return timeSpentMinutes; }
    public void setTimeSpentMinutes(Integer timeSpentMinutes) { this.timeSpentMinutes = timeSpentMinutes; }

    // Builder
    public static LessonProgressResponseBuilder builder() { return new LessonProgressResponseBuilder(); }
    public static class LessonProgressResponseBuilder {
        private LessonProgressResponse r = new LessonProgressResponse();
        public LessonProgressResponseBuilder id(UUID id) { r.setId(id); return this; }
        public LessonProgressResponseBuilder lessonId(UUID id) { r.setLessonId(id); return this; }
        public LessonProgressResponseBuilder status(String status) { r.setStatus(status); return this; }
        public LessonProgressResponseBuilder isCompleted(boolean c) { r.setIsCompleted(c); return this; }
        public LessonProgressResponseBuilder startedAt(Instant s) { r.setStartedAt(s); return this; }
        public LessonProgressResponseBuilder completedAt(Instant c) { r.setCompletedAt(c); return this; }
        public LessonProgressResponseBuilder timeSpentMinutes(Integer t) { r.setTimeSpentMinutes(t); return this; }
        public LessonProgressResponse build() { return r; }
    }
}