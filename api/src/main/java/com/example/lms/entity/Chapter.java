package com.example.lms.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.ArrayList;

@Entity
@Table(name = "chapters")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Chapter {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    @JsonIgnore
    private Course course;
    
    @Column(nullable = false)
    private String title;
    
    private String description;
    
    @Column(name = "order_index", nullable = false)
    private Integer orderIndex = 0;
    
    @OneToMany(mappedBy = "chapter", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @JsonIgnore
    private List<Lesson> lessons = new ArrayList<>();
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public Chapter() {}

    public Chapter(UUID id, Course course, String title, String description, Integer orderIndex, List<Lesson> lessons, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.course = course;
        this.title = title;
        this.description = description;
        this.orderIndex = orderIndex != null ? orderIndex : 0;
        this.lessons = lessons != null ? lessons : new ArrayList<>();
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Course getCourse() { return course; }
    public void setCourse(Course course) { this.course = course; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Integer getOrderIndex() { return orderIndex; }
    public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    public List<Lesson> getLessons() { return lessons; }
    public void setLessons(List<Lesson> lessons) { this.lessons = lessons; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    // Manual Builder
    public static ChapterBuilder builder() { return new ChapterBuilder(); }
    public static class ChapterBuilder {
        private Chapter chapter = new Chapter();
        public ChapterBuilder id(UUID id) { chapter.setId(id); return this; }
        public ChapterBuilder course(Course c) { chapter.setCourse(c); return this; }
        public ChapterBuilder title(String t) { chapter.setTitle(t); return this; }
        public ChapterBuilder description(String d) { chapter.setDescription(d); return this; }
        public ChapterBuilder orderIndex(Integer o) { chapter.setOrderIndex(o); return this; }
        public ChapterBuilder lessons(List<Lesson> l) { chapter.setLessons(l); return this; }
        public ChapterBuilder createdAt(Instant c) { chapter.setCreatedAt(c); return this; }
        public ChapterBuilder updatedAt(Instant u) { chapter.setUpdatedAt(u); return this; }
        public Chapter build() { return chapter; }
    }
}
