package com.example.lms.course_management.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Entity(name = "ChapterAuthoring")
@Table(name = "chapter_authoring") // Renamed from 'chapters' to avoid conflict
public class Chapter {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(nullable = false)
    private String title;

    @Column(name = "order_index")
    private Integer orderIndex;

    @Column(name = "is_published")
    @Builder.Default
    private boolean isPublished = false; // Granular control if needed

    @OneToMany(mappedBy = "chapter", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<Lesson> lessons = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public Chapter() {}

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Course getCourse() { return course; }
    public void setCourse(Course course) { this.course = course; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public Integer getOrderIndex() { return orderIndex; }
    public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    public boolean isPublished() { return isPublished; }
    public void setPublished(boolean isPublished) { this.isPublished = isPublished; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    // Manual Builder
    public static ChapterBuilder builder() { return new ChapterBuilder(); }
    public static class ChapterBuilder {
        private Chapter c = new Chapter();
        public ChapterBuilder id(UUID id) { c.setId(id); return this; }
        public ChapterBuilder course(Course course) { c.setCourse(course); return this; }
        public ChapterBuilder title(String title) { c.setTitle(title); return this; }
        public ChapterBuilder orderIndex(Integer order) { c.setOrderIndex(order); return this; }
        public ChapterBuilder isPublished(boolean isPublished) { c.setPublished(isPublished); return this; }
        public ChapterBuilder lessons(List<Lesson> lessons) { c.lessons = lessons != null ? lessons : new ArrayList<>(); return this; }
        public ChapterBuilder createdAt(Instant createdAt) { c.setCreatedAt(createdAt); return this; }
        public Chapter build() { return c; }
    }

    // Domain Behavior
    
    public void addLesson(Lesson lesson) {
        lesson.setChapter(this);
        this.lessons.add(lesson);
    }
    
    public void removeLesson(Lesson lesson) {
        this.lessons.remove(lesson);
        lesson.setChapter(null);
    }
    
    public List<Lesson> getLessons() {
        return Collections.unmodifiableList(lessons);
    }
}
