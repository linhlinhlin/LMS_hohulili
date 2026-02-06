package com.example.lms.course_management.domain.model;

import java.time.Instant;
import java.util.UUID;

/**
 * Lesson entity in Course Management bounded context.
 * 
 * DDD PURE DOMAIN MODEL:
 * - NO JPA annotations (framework-free)
 * - Contains only business logic
 * - Part of Course aggregate via Chapter
 */
public class Lesson {

    private UUID id;
    private Chapter chapter;
    private String title;
    private LessonType type;
    private String contentUrl;
    private String contentHtml;
    private Integer durationSeconds;
    private Integer orderIndex;
    private boolean isRequired = true;
    private Integer minWatchPercent;
    private Integer minQuizScore;
    private Instant createdAt;

    protected Lesson() {}

    // ============ FACTORY METHODS ============
    
    public static Lesson create(Chapter chapter, String title, LessonType type) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Lesson title is required");
        }
        if (type == null) {
            throw new IllegalArgumentException("Lesson type is required");
        }
        
        Lesson lesson = new Lesson();
        lesson.id = UUID.randomUUID();
        lesson.chapter = chapter;
        lesson.title = title;
        lesson.type = type;
        lesson.isRequired = true;
        lesson.createdAt = Instant.now();
        return lesson;
    }
    
    public static Lesson reconstitute(
            UUID id,
            Chapter chapter,
            String title,
            LessonType type,
            String contentUrl,
            String contentHtml,
            Integer durationSeconds,
            Integer orderIndex,
            boolean isRequired,
            Integer minWatchPercent,
            Integer minQuizScore,
            Instant createdAt
    ) {
        Lesson lesson = new Lesson();
        lesson.id = id;
        lesson.chapter = chapter;
        lesson.title = title;
        lesson.type = type;
        lesson.contentUrl = contentUrl;
        lesson.contentHtml = contentHtml;
        lesson.durationSeconds = durationSeconds;
        lesson.orderIndex = orderIndex;
        lesson.isRequired = isRequired;
        lesson.minWatchPercent = minWatchPercent;
        lesson.minQuizScore = minQuizScore;
        lesson.createdAt = createdAt;
        return lesson;
    }

    // ============ DOMAIN BEHAVIOR ============
    
    public boolean isVideoLesson() {
        return type == LessonType.VIDEO;
    }
    
    public boolean isQuizLesson() {
        return type == LessonType.QUIZ;
    }
    
    public boolean isAssignmentLesson() {
        return type == LessonType.ASSIGNMENT;
    }
    
    public boolean isTextLesson() {
        return type == LessonType.TEXT;
    }

    // ============ GETTERS ============
    
    public UUID getId() { return id; }
    public Chapter getChapter() { return chapter; }
    public String getTitle() { return title; }
    public LessonType getType() { return type; }
    public String getContentUrl() { return contentUrl; }
    public String getContentHtml() { return contentHtml; }
    public Integer getDurationSeconds() { return durationSeconds; }
    public Integer getOrderIndex() { return orderIndex; }
    public boolean isRequired() { return isRequired; }
    public Integer getMinWatchPercent() { return minWatchPercent; }
    public Integer getMinQuizScore() { return minQuizScore; }
    public Instant getCreatedAt() { return createdAt; }

    // ============ BEHAVIOR METHODS ============

    public void updateInfo(String title, LessonType type) {
        if (title != null && !title.isBlank()) this.title = title;
        if (type != null) this.type = type;
    }

    public void updateContent(String contentUrl, String contentHtml) {
        if (contentUrl != null) this.contentUrl = contentUrl;
        if (contentHtml != null) this.contentHtml = contentHtml;
    }

    public void updateSettings(Integer durationSeconds, Boolean isRequired, Integer minWatchPercent, Integer minQuizScore) {
        if (durationSeconds != null) this.durationSeconds = durationSeconds;
        if (isRequired != null) this.isRequired = isRequired;
        if (minWatchPercent != null) this.minWatchPercent = minWatchPercent;
        if (minQuizScore != null) this.minQuizScore = minQuizScore;
    }

    // Package-private: only Chapter aggregate can set parent reference
    void setChapter(Chapter chapter) { this.chapter = chapter; }

    // ============ BUILDER ============
    
    public static LessonBuilder builder() { return new LessonBuilder(); }
    
    public static class LessonBuilder {
        private Lesson l = new Lesson();
        public LessonBuilder id(UUID id) { l.id = id; return this; }
        public LessonBuilder chapter(Chapter c) { l.chapter = c; return this; }
        public LessonBuilder title(String t) { l.title = t; return this; }
        public LessonBuilder type(LessonType t) { l.type = t; return this; }
        public LessonBuilder contentUrl(String u) { l.contentUrl = u; return this; }
        public LessonBuilder contentHtml(String h) { l.contentHtml = h; return this; }
        public LessonBuilder durationSeconds(Integer d) { l.durationSeconds = d; return this; }
        public LessonBuilder orderIndex(Integer o) { l.orderIndex = o; return this; }
        public LessonBuilder isRequired(boolean r) { l.isRequired = r; return this; }
        public LessonBuilder minWatchPercent(Integer m) { l.minWatchPercent = m; return this; }
        public LessonBuilder minQuizScore(Integer m) { l.minQuizScore = m; return this; }
        public LessonBuilder createdAt(Instant c) { l.createdAt = c; return this; }
        public Lesson build() { return l; }
    }

    // ============ VALUE OBJECTS (Enums) ============

    public enum LessonType {
        VIDEO, QUIZ, ASSIGNMENT, TEXT
    }
}
