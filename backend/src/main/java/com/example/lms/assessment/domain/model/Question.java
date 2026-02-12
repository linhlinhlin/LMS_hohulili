package com.example.lms.assessment.domain.model;

import com.example.lms.shared.domain.model.ContentBlock;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

public class Question {
    // Manual boilerplate
    public Question(UUID id, List<ContentBlock> contentBlocks, Difficulty difficulty, String tags, Status status, QuestionType questionType, String correctOption, Map<String, Object> answerKey, UUID createdBy, UUID courseId, UUID packageId, UUID categoryId, Integer usageCount, BigDecimal correctRate, List<QuestionOption> options, Instant createdAt, Instant updatedAt) {
        this.id = id; this.contentBlocks = contentBlocks; this.difficulty = difficulty; this.tags = tags; this.status = status; this.questionType = questionType != null ? questionType : QuestionType.SINGLE_CHOICE; this.correctOption = correctOption; this.answerKey = answerKey; this.createdBy = createdBy; this.courseId = courseId; this.packageId = packageId; this.categoryId = categoryId; this.usageCount = usageCount; this.correctRate = correctRate; this.options = options; this.createdAt = createdAt; this.updatedAt = updatedAt;
    }
    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private UUID id; private List<ContentBlock> contentBlocks; private Difficulty difficulty; private String tags; private Status status; private QuestionType questionType = QuestionType.SINGLE_CHOICE; private String correctOption; private Map<String, Object> answerKey; private UUID createdBy; private UUID courseId; private UUID packageId; private UUID categoryId; private Integer usageCount = 0; private BigDecimal correctRate = BigDecimal.ZERO; private List<QuestionOption> options; private Instant createdAt; private Instant updatedAt;
        public Builder id(UUID id) { this.id = id; return this; }
        public Builder contentBlocks(List<ContentBlock> contentBlocks) { this.contentBlocks = contentBlocks; return this; }
        public Builder difficulty(Difficulty difficulty) { this.difficulty = difficulty; return this; }
        public Builder tags(String tags) { this.tags = tags; return this; }
        public Builder status(Status status) { this.status = status; return this; }
        public Builder questionType(QuestionType questionType) { this.questionType = questionType; return this; }
        public Builder correctOption(String correctOption) { this.correctOption = correctOption; return this; }
        public Builder answerKey(Map<String, Object> answerKey) { this.answerKey = answerKey; return this; }
        public Builder createdBy(UUID createdBy) { this.createdBy = createdBy; return this; }
        public Builder courseId(UUID courseId) { this.courseId = courseId; return this; }
        public Builder packageId(UUID packageId) { this.packageId = packageId; return this; }
        public Builder categoryId(UUID categoryId) { this.categoryId = categoryId; return this; }
        public Builder usageCount(Integer usageCount) { this.usageCount = usageCount; return this; }
        public Builder correctRate(BigDecimal correctRate) { this.correctRate = correctRate; return this; }
        public Builder options(List<QuestionOption> options) { this.options = options; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }
        public Question build() { return new Question(id, contentBlocks, difficulty, tags, status, questionType, correctOption, answerKey, createdBy, courseId, packageId, categoryId, usageCount, correctRate, options, createdAt, updatedAt); }
    }

    private UUID id;
    private List<ContentBlock> contentBlocks;
    private Difficulty difficulty;
    private String tags;
    private Status status;
    private QuestionType questionType;
    private String correctOption;
    private Map<String, Object> answerKey;
    private UUID createdBy; // Reference by ID
    private UUID courseId; // Reference by ID
    private UUID packageId; // Reference by ID
    private UUID categoryId; // QuestionBankCategory reference (nullable)
    private Integer usageCount;
    private BigDecimal correctRate;
    private List<QuestionOption> options;
    private Instant createdAt;
    private Instant updatedAt;

    // ============ Domain Behavior ============

    public void updateContentBlocks(List<ContentBlock> blocks) {
        if (blocks != null) {
            this.contentBlocks = blocks;
            this.updatedAt = Instant.now();
        }
    }

    public void updateDifficulty(Difficulty difficulty) {
        if (difficulty != null) {
            this.difficulty = difficulty;
            this.updatedAt = Instant.now();
        }
    }

    public void updateTags(String tags) {
        if (tags != null) {
            this.tags = tags;
            this.updatedAt = Instant.now();
        }
    }

    public void updateStatus(Status status) {
        if (status != null) {
            this.status = status;
            this.updatedAt = Instant.now();
        }
    }

    public void updateCorrectOption(String correctOption) {
        if (correctOption != null) {
            this.correctOption = correctOption;
            this.updatedAt = Instant.now();
        }
    }

    public void updateQuestionType(QuestionType questionType) {
        if (questionType != null) {
            this.questionType = questionType;
            this.updatedAt = Instant.now();
        }
    }

    public void updateAnswerKey(Map<String, Object> answerKey) {
        if (answerKey != null) {
            this.answerKey = answerKey;
            this.updatedAt = Instant.now();
        }
    }

    public void replaceOptions(List<QuestionOption> options) {
        this.options = options;
        this.updatedAt = Instant.now();
    }

    public void moveToBank(UUID bankId, UUID categoryId) {
        this.packageId = bankId;
        this.categoryId = categoryId;
        this.updatedAt = Instant.now();
    }

    public void moveToCategory(UUID categoryId) {
        this.categoryId = categoryId;
        this.updatedAt = Instant.now();
    }

    // Getters
    public UUID getId() { return id; }
    public List<ContentBlock> getContentBlocks() { return contentBlocks; }
    public Difficulty getDifficulty() { return difficulty; }
    public String getTags() { return tags; }
    public Status getStatus() { return status; }
    public QuestionType getQuestionType() { return questionType; }
    public String getCorrectOption() { return correctOption; }
    public Map<String, Object> getAnswerKey() { return answerKey; }
    public UUID getCreatedBy() { return createdBy; }
    public UUID getCourseId() { return courseId; }
    public UUID getPackageId() { return packageId; }
    public UUID getCategoryId() { return categoryId; }
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

    public enum QuestionType {
        SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE,
        FILL_IN_BLANK, SHORT_ANSWER, ESSAY
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
