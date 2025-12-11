package com.example.lms.entity;

import jakarta.persistence.*;
import jakarta.persistence.Convert;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.ArrayList;

@Entity
@Table(name = "lessons")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Lesson {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chapter_id", nullable = false)
    @JsonIgnore
    private Chapter chapter;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;
    
    // Content fields removed - moved to Section (Level 3)

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex = 0;

    @Column(name = "lesson_type")
    @Convert(converter = com.example.lms.entity.converter.LessonTypeConverter.class)
    private LessonType lessonType = LessonType.LECTURE;
    
    // Level 3 Children
    @OneToMany(mappedBy = "lesson", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @JsonIgnore
    private List<Section> sections = new ArrayList<>();

    @OneToOne(mappedBy = "lesson", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private LessonAssignment lessonAssignment;

    @OneToMany(mappedBy = "lesson", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    @JsonIgnore
    private List<LessonAttachment> attachments = new ArrayList<>();

    // Removed direct Quiz relationship (now attached to Section)
    // private Quiz quiz;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum LessonType {
        LECTURE,
        ASSIGNMENT,
        QUIZ
    }

    public Lesson() {}

    public Lesson(UUID id, Chapter chapter, String title, String description, Integer orderIndex, LessonType lessonType, List<Section> sections, LessonAssignment lessonAssignment, List<LessonAttachment> attachments, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.chapter = chapter;
        this.title = title;
        this.description = description;
        this.orderIndex = orderIndex != null ? orderIndex : 0;
        this.lessonType = lessonType != null ? lessonType : LessonType.LECTURE;
        this.sections = sections != null ? sections : new ArrayList<>();
        this.lessonAssignment = lessonAssignment;
        this.attachments = attachments != null ? attachments : new ArrayList<>();
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Chapter getChapter() { return chapter; }
    public void setChapter(Chapter chapter) { this.chapter = chapter; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Integer getOrderIndex() { return orderIndex; }
    public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    public LessonType getLessonType() { return lessonType; }
    public void setLessonType(LessonType lessonType) { this.lessonType = lessonType; }
    public List<Section> getSections() { return sections; }
    public void setSections(List<Section> sections) { this.sections = sections; }
    public LessonAssignment getLessonAssignment() { return lessonAssignment; }
    public void setLessonAssignment(LessonAssignment lessonAssignment) { this.lessonAssignment = lessonAssignment; }
    public List<LessonAttachment> getAttachments() { return attachments; }
    public void setAttachments(List<LessonAttachment> attachments) { this.attachments = attachments; }
    // public Quiz getQuiz() { return quiz; }
    // public void setQuiz(Quiz quiz) { this.quiz = quiz; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    // Manual Builder
    public static LessonBuilder builder() { return new LessonBuilder(); }
    public static class LessonBuilder {
        private Lesson lesson = new Lesson();
        public LessonBuilder id(UUID id) { lesson.setId(id); return this; }
        public LessonBuilder chapter(Chapter c) { lesson.setChapter(c); return this; }
        public LessonBuilder title(String t) { lesson.setTitle(t); return this; }
        public LessonBuilder description(String d) { lesson.setDescription(d); return this; }
        public LessonBuilder orderIndex(Integer o) { lesson.setOrderIndex(o); return this; }
        public LessonBuilder lessonType(LessonType l) { lesson.setLessonType(l); return this; }
        public LessonBuilder sections(List<Section> s) { lesson.setSections(s); return this; }
        public LessonBuilder lessonAssignment(LessonAssignment la) { lesson.setLessonAssignment(la); return this; }
        public LessonBuilder attachments(List<LessonAttachment> a) { lesson.setAttachments(a); return this; }
        // public LessonBuilder quiz(Quiz q) { lesson.setQuiz(q); return this; }
        public LessonBuilder createdAt(Instant c) { lesson.setCreatedAt(c); return this; }
        public LessonBuilder updatedAt(Instant u) { lesson.setUpdatedAt(u); return this; }
        public Lesson build() { return lesson; }
    }
}