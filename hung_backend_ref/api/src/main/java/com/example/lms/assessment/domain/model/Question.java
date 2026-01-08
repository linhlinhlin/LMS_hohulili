package com.example.lms.assessment.domain.model;

import com.example.lms.shared.domain.model.ContentBlock;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

public class Question {
    // Manual boilerplate
    public Question(UUID id, List<ContentBlock> contentBlocks, Difficulty difficulty, String tags, Status status, String correctOption, UUID createdBy, UUID courseId, UUID packageId, Integer usageCount, BigDecimal correctRate, List<QuestionOption> options, Instant createdAt, Instant updatedAt) {
        this.id = id; this.contentBlocks = contentBlocks; this.difficulty = difficulty; this.tags = tags; this.status = status; this.correctOption = correctOption; this.createdBy = createdBy; this.courseId = courseId; this.packageId = packageId; this.usageCount = usageCount; this.correctRate = correctRate; this.options = options; this.createdAt = createdAt; this.updatedAt = updatedAt;
    }
    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private UUID id; private List<ContentBlock> contentBlocks; private Difficulty difficulty; private String tags; private Status status; private String correctOption; private UUID createdBy; private UUID courseId; private UUID packageId; private Integer usageCount; private BigDecimal correctRate; private List<QuestionOption> options; private Instant createdAt; private Instant updatedAt;
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
        public Builder options(List<QuestionOption> options) { this.options = options; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }
        public Question build() { return new Question(id, contentBlocks, difficulty, tags, status, correctOption, createdBy, courseId, packageId, usageCount, correctRate, options, createdAt, updatedAt); }
    }

    private UUID id;
    private List<ContentBlock> contentBlocks;
    private Difficulty difficulty;
    private String tags;
    private Status status;
    private String correctOption;
    private UUID createdBy; // Reference by ID
    private UUID courseId; // Reference by ID
    private UUID packageId; // Reference by ID
    private Integer usageCount;
    private BigDecimal correctRate;
    private List<QuestionOption> options;
    private Instant createdAt;
    private Instant updatedAt;

    // Getters
    public UUID getId() { return id; }
    public List<ContentBlock> getContentBlocks() { return contentBlocks; }
    public Difficulty getDifficulty() { return difficulty; }
    public String getTags() { return tags; }
    public Status getStatus() { return status; }
    public String getCorrectOption() { return correctOption; }
    public UUID getCreatedBy() { return createdBy; }
    public UUID getCourseId() { return courseId; }
    public UUID getPackageId() { return packageId; }
    public Integer getUsageCount() { return usageCount; }
    public BigDecimal getCorrectRate() { return correctRate; }
    public List<QuestionOption> getOptions() { return options; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public enum Difficulty {
        EASY, MEDIUM, HARD
    }

    public enum Status {
        DRAFT, ACTIVE, INACTIVE
    }

    public static class QuestionOption {
        // Manual boilerplate for inner class
        public QuestionOption(UUID id, String key, List<ContentBlock> contentBlocks, Integer orderIndex) {
            this.id = id; this.key = key; this.contentBlocks = contentBlocks; this.orderIndex = orderIndex;
        }
        public static QuestionOptionBuilder builder() { return new QuestionOptionBuilder(); }
        public static class QuestionOptionBuilder {
             private UUID id; private String key; private List<ContentBlock> contentBlocks; private Integer orderIndex;
             public QuestionOptionBuilder id(UUID id) { this.id = id; return this; }
             public QuestionOptionBuilder key(String key) { this.key = key; return this; }
             public QuestionOptionBuilder contentBlocks(List<ContentBlock> contentBlocks) { this.contentBlocks = contentBlocks; return this; }
             public QuestionOptionBuilder orderIndex(Integer orderIndex) { this.orderIndex = orderIndex; return this; }
             public QuestionOption build() { return new QuestionOption(id, key, contentBlocks, orderIndex); }
        }

        private UUID id;
        private String key; // A, B, C, D
        private List<ContentBlock> contentBlocks; // Rich Text
        private Integer orderIndex;
        
        // Getters
        public UUID getId() { return id; }
        public String getKey() { return key; }
        public List<ContentBlock> getContentBlocks() { return contentBlocks; }
        public Integer getOrderIndex() { return orderIndex; }

        public static QuestionOption create(String key, List<ContentBlock> contentBlocks, int order) {
            return QuestionOption.builder()
                .id(UUID.randomUUID()) // Generate ID for new options
                .key(key)
                .contentBlocks(contentBlocks)
                .orderIndex(order)
                .build();
        }
    }
}
