package com.example.lms.course_management.domain.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity(name = "LessonAuthoring")
@Table(name = "lesson_authoring")
public class Lesson {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chapter_id", nullable = false)
    private Chapter chapter;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LessonType type;

    // Content fields (nullable depending on type)
    @Column(name = "content_url", columnDefinition = "TEXT")
    private String contentUrl; // Video URL or file URL

    @Column(name = "content_html", columnDefinition = "TEXT")
    private String contentHtml; // HTML content from rich text editor (Quill)

    // Getters and setters for contentHtml
    public String getContentHtml() {
        return contentHtml;
    }

    public void setContentHtml(String contentHtml) {
        this.contentHtml = contentHtml;
    }

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    // Settings
    @Column(name = "order_index")
    private Integer orderIndex;

    @Column(name = "is_required")
    private boolean isRequired = true;

    public Lesson() {}

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Chapter getChapter() { return chapter; }
    public void setChapter(Chapter chapter) { this.chapter = chapter; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public LessonType getType() { return type; }
    public void setType(LessonType type) { this.type = type; }
    public String getContentUrl() { return contentUrl; }
    public void setContentUrl(String contentUrl) { this.contentUrl = contentUrl; }
    // getContentHtml already exists manually
    public Integer getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }
    public Integer getOrderIndex() { return orderIndex; }
    public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    public boolean isRequired() { return isRequired; }
    public void setRequired(boolean isRequired) { this.isRequired = isRequired; }
    public Integer getMinWatchPercent() { return minWatchPercent; }
    public void setMinWatchPercent(Integer minWatchPercent) { this.minWatchPercent = minWatchPercent; }
    public Integer getMinQuizScore() { return minQuizScore; }
    public void setMinQuizScore(Integer minQuizScore) { this.minQuizScore = minQuizScore; }
    public Instant getCreatedAt() { return createdAt; }
    // public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; } // Updatable=false

    // Manual Builder
    public static LessonBuilder builder() { return new LessonBuilder(); }
    public static class LessonBuilder {
        private Lesson l = new Lesson();
        public LessonBuilder id(UUID id) { l.setId(id); return this; }
        public LessonBuilder chapter(Chapter c) { l.setChapter(c); return this; }
        public LessonBuilder title(String t) { l.setTitle(t); return this; }
        public LessonBuilder type(LessonType t) { l.setType(t); return this; }
        public LessonBuilder contentUrl(String u) { l.setContentUrl(u); return this; }
        public LessonBuilder contentHtml(String h) { l.setContentHtml(h); return this; }
        public LessonBuilder durationSeconds(Integer d) { l.setDurationSeconds(d); return this; }
        public LessonBuilder orderIndex(Integer o) { l.setOrderIndex(o); return this; }
        public LessonBuilder isRequired(boolean r) { l.setRequired(r); return this; }
        public LessonBuilder minWatchPercent(Integer m) { l.setMinWatchPercent(m); return this; }
        public LessonBuilder minQuizScore(Integer m) { l.setMinQuizScore(m); return this; }
        public Lesson build() { return l; }
    }

    @Column(name = "min_watch_percent")
    private Integer minWatchPercent;

    @Column(name = "min_quiz_score")
    private Integer minQuizScore;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public enum LessonType {
        VIDEO, QUIZ, ASSIGNMENT, TEXT
    }
}
