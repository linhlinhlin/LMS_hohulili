package com.example.lms.assessment.infrastructure.persistence.entity;

import com.example.lms.shared.domain.model.ContentBlock;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * JPA Entity for Question.
 * Maps 'questions' table.
 */
@Entity
@Table(name = "questions")
public class QuestionJpaEntity {
    // Manual boilerplate
    public QuestionJpaEntity() {}
    public QuestionJpaEntity(UUID id, List<ContentBlock> contentBlocks, Difficulty difficulty, String tags, Status status, String correctOption, UUID createdBy, UUID courseId, UUID packageId, Integer usageCount, BigDecimal correctRate, List<QuestionOptionJpaEntity> options, Instant createdAt, Instant updatedAt) {
        this.id = id; this.contentBlocks = contentBlocks; this.difficulty = difficulty; this.tags = tags; this.status = status; this.correctOption = correctOption; this.createdBy = createdBy; this.courseId = courseId; this.packageId = packageId; this.usageCount = usageCount; this.correctRate = correctRate; this.options = options; this.createdAt = createdAt; this.updatedAt = updatedAt;
    }
    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private UUID id; private List<ContentBlock> contentBlocks; private Difficulty difficulty = Difficulty.MEDIUM; private String tags; private Status status = Status.DRAFT; private String correctOption; private UUID createdBy; private UUID courseId; private UUID packageId; private Integer usageCount = 0; private BigDecimal correctRate = BigDecimal.ZERO; private List<QuestionOptionJpaEntity> options; private Instant createdAt; private Instant updatedAt;
        public Builder id(UUID id) { this.id = id; return this; }
        public Builder contentBlocks(List<ContentBlock> contentBlocks) { this.contentBlocks = contentBlocks; return this; }
        public Builder difficulty(Difficulty difficulty) { this.difficulty = difficulty; return this; }
        public Builder tags(String tags) { this.tags = tags; return this; }
        public Builder status(Status status) { this.status = status; return this; }
        public Builder correctOption(String correctOption) { this.correctOption = correctOption; return this; }
        public Builder createdBy(UUID createdBy) { this.createdBy = createdBy; return this; }
        public Builder courseId(UUID courseId) { this.courseId = courseId; return this; }
        public Builder packageId(UUID packageId) { this.packageId = packageId; return this; }
        public Builder usageCount(Integer usageCount) { this.usageCount = usageCount; return this; }
        public Builder correctRate(BigDecimal correctRate) { this.correctRate = correctRate; return this; }
        public Builder options(List<QuestionOptionJpaEntity> options) { this.options = options; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }
        public QuestionJpaEntity build() { return new QuestionJpaEntity(id, contentBlocks, difficulty, tags, status, correctOption, createdBy, courseId, packageId, usageCount, correctRate, options, createdAt, updatedAt); }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Type(JsonType.class)
    @Column(name = "content", columnDefinition = "jsonb")
    private List<ContentBlock> contentBlocks;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Difficulty difficulty = Difficulty.MEDIUM;

    @Column(columnDefinition = "TEXT")
    private String tags;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.DRAFT;

    @Column(name = "correct_option", nullable = false)
    private String correctOption;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "course_id")
    private UUID courseId;

    @Column(name = "package_id")
    private UUID packageId;

    @Column(name = "usage_count", nullable = false)
    private Integer usageCount = 0;

    @Column(name = "correct_rate", precision = 5, scale = 2)
    private BigDecimal correctRate = BigDecimal.ZERO;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private List<QuestionOptionJpaEntity> options;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    // Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public List<ContentBlock> getContentBlocks() { return contentBlocks; }
    public void setContentBlocks(List<ContentBlock> contentBlocks) { this.contentBlocks = contentBlocks; }
    public Difficulty getDifficulty() { return difficulty; }
    public void setDifficulty(Difficulty difficulty) { this.difficulty = difficulty; }
    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public String getCorrectOption() { return correctOption; }
    public void setCorrectOption(String correctOption) { this.correctOption = correctOption; }
    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }
    public UUID getCourseId() { return courseId; }
    public void setCourseId(UUID courseId) { this.courseId = courseId; }
    public UUID getPackageId() { return packageId; }
    public void setPackageId(UUID packageId) { this.packageId = packageId; }
    public Integer getUsageCount() { return usageCount; }
    public void setUsageCount(Integer usageCount) { this.usageCount = usageCount; }
    public BigDecimal getCorrectRate() { return correctRate; }
    public void setCorrectRate(BigDecimal correctRate) { this.correctRate = correctRate; }
    public List<QuestionOptionJpaEntity> getOptions() { return options; }
    public void setOptions(List<QuestionOptionJpaEntity> options) { this.options = options; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public enum Difficulty {
        EASY, MEDIUM, HARD
    }

    public enum Status {
        DRAFT, ACTIVE, INACTIVE
    }
}
