package com.example.lms.course_management.domain.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Chapter entity in Course Management bounded context.
 * 
 * DDD PURE DOMAIN MODEL:
 * - NO JPA annotations (framework-free)
 * - Contains only business logic
 * - Part of Course aggregate
 */
public class Chapter {

    private UUID id;
    private Course course;
    private String title;
    private Integer orderIndex;
    private boolean isPublished = false;
    private List<Lesson> lessons = new ArrayList<>();
    private Instant createdAt;

    protected Chapter() {}

    // ============ FACTORY METHODS ============
    
    public static Chapter create(Course course, String title, Integer orderIndex) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Chapter title is required");
        }
        
        Chapter chapter = new Chapter();
        chapter.id = UUID.randomUUID();
        chapter.course = course;
        chapter.title = title;
        chapter.orderIndex = orderIndex != null ? orderIndex : 0;
        chapter.isPublished = false;
        chapter.createdAt = Instant.now();
        return chapter;
    }
    
    public static Chapter reconstitute(
            UUID id,
            Course course,
            String title,
            Integer orderIndex,
            boolean isPublished,
            List<Lesson> lessons,
            Instant createdAt
    ) {
        Chapter chapter = new Chapter();
        chapter.id = id;
        chapter.course = course;
        chapter.title = title;
        chapter.orderIndex = orderIndex;
        chapter.isPublished = isPublished;
        chapter.lessons = lessons != null ? new ArrayList<>(lessons) : new ArrayList<>();
        chapter.createdAt = createdAt;
        return chapter;
    }

    // ============ DOMAIN BEHAVIOR ============
    
    public void addLesson(Lesson lesson) {
        if (lesson == null) {
            throw new IllegalArgumentException("Lesson cannot be null");
        }
        lesson.setChapter(this);
        this.lessons.add(lesson);
    }
    
    public void removeLesson(Lesson lesson) {
        if (lesson != null) {
            this.lessons.remove(lesson);
            lesson.setChapter(null);
        }
    }
    
    public void publish() {
        this.isPublished = true;
    }
    
    public void unpublish() {
        this.isPublished = false;
    }

    // ============ GETTERS ============
    
    public UUID getId() { return id; }
    public Course getCourse() { return course; }
    public String getTitle() { return title; }
    public Integer getOrderIndex() { return orderIndex; }
    public boolean isPublished() { return isPublished; }
    public Instant getCreatedAt() { return createdAt; }
    
    public List<Lesson> getLessons() {
        return Collections.unmodifiableList(lessons);
    }

    // ============ SETTERS ============
    
    public void setId(UUID id) { this.id = id; }
    public void setCourse(Course course) { this.course = course; }
    public void setTitle(String title) { this.title = title; }
    public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    public void setPublished(boolean isPublished) { this.isPublished = isPublished; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public void setLessons(List<Lesson> lessons) { this.lessons = lessons != null ? new ArrayList<>(lessons) : new ArrayList<>(); }

    // ============ BUILDER ============
    
    public static ChapterBuilder builder() { return new ChapterBuilder(); }
    
    public static class ChapterBuilder {
        private Chapter c = new Chapter();
        public ChapterBuilder id(UUID id) { c.id = id; return this; }
        public ChapterBuilder course(Course course) { c.course = course; return this; }
        public ChapterBuilder title(String title) { c.title = title; return this; }
        public ChapterBuilder orderIndex(Integer order) { c.orderIndex = order; return this; }
        public ChapterBuilder isPublished(boolean isPublished) { c.isPublished = isPublished; return this; }
        public ChapterBuilder lessons(List<Lesson> lessons) { c.lessons = lessons != null ? new ArrayList<>(lessons) : new ArrayList<>(); return this; }
        public ChapterBuilder createdAt(Instant createdAt) { c.createdAt = createdAt; return this; }
        public Chapter build() { return c; }
    }
}
