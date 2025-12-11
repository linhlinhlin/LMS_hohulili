package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "questions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty", nullable = false)
    @Builder.Default
    private Difficulty difficulty = Difficulty.MEDIUM;

    @Column(columnDefinition = "TEXT")
    private String tags; // JSON array of tags

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private Status status = Status.DRAFT;

    @Column(name = "correct_option", nullable = false)
    private String correctOption; // A, B, C, D

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "package_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Package packageEntity;

    @Column(name = "usage_count", nullable = false)
    @Builder.Default
    private Integer usageCount = 0;

    @Column(name = "correct_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal correctRate = BigDecimal.ZERO; // percentage (0.0 to 100.0)

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("optionKey ASC")
    @Builder.Default
    private List<QuestionOption> options = new java.util.ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    // ============ DOMAIN METHODS ============

    /**
     * Check if this question belongs to a specific course
     * @param courseId the course ID to check
     * @return true if question belongs to the course
     */
    public boolean belongsToCourse(UUID courseId) {
        return this.course != null && this.course.getId().equals(courseId);
    }

    public enum Difficulty {
        EASY, MEDIUM, HARD
    }

    public enum Status {
        DRAFT, ACTIVE, INACTIVE
    }

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Difficulty getDifficulty() { return difficulty; }
    public void setDifficulty(Difficulty difficulty) { this.difficulty = difficulty; }
    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public String getCorrectOption() { return correctOption; }
    public void setCorrectOption(String correctOption) { this.correctOption = correctOption; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
    public Course getCourse() { return course; }
    public void setCourse(Course course) { this.course = course; }
    public Package getPackageEntity() { return packageEntity; }
    public void setPackageEntity(Package packageEntity) { this.packageEntity = packageEntity; }
    public Integer getUsageCount() { return usageCount; }
    public void setUsageCount(Integer usageCount) { this.usageCount = usageCount; }
    public BigDecimal getCorrectRate() { return correctRate; }
    public void setCorrectRate(BigDecimal correctRate) { this.correctRate = correctRate; }
    public List<QuestionOption> getOptions() { return options; }
    public void setOptions(List<QuestionOption> options) { this.options = options; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    // Manual Builder
    public static QuestionBuilder builder() { return new QuestionBuilder(); }
    public static class QuestionBuilder {
        private Question question = new Question();
        public QuestionBuilder id(UUID id) { question.setId(id); return this; }
        public QuestionBuilder content(String c) { question.setContent(c); return this; }
        public QuestionBuilder difficulty(Difficulty d) { question.setDifficulty(d); return this; }
        public QuestionBuilder tags(String t) { question.setTags(t); return this; }
        public QuestionBuilder status(Status s) { question.setStatus(s); return this; }
        public QuestionBuilder correctOption(String c) { question.setCorrectOption(c); return this; }
        public QuestionBuilder createdBy(User u) { question.setCreatedBy(u); return this; }
        public QuestionBuilder course(Course c) { question.setCourse(c); return this; }
        public QuestionBuilder packageEntity(Package p) { question.setPackageEntity(p); return this; }
        public QuestionBuilder usageCount(Integer u) { question.setUsageCount(u); return this; }
        public QuestionBuilder correctRate(BigDecimal r) { question.setCorrectRate(r); return this; }
        public QuestionBuilder options(List<QuestionOption> o) { question.setOptions(o); return this; }
        public QuestionBuilder createdAt(Instant c) { question.setCreatedAt(c); return this; }
        public QuestionBuilder updatedAt(Instant u) { question.setUpdatedAt(u); return this; }
        public Question build() { return question; }
    }
}