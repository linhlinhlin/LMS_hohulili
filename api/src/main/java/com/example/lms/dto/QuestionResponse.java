package com.example.lms.dto;

import com.example.lms.entity.Question;
import com.example.lms.entity.QuestionOption;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.ArrayList;

public class QuestionResponse {
    
    private UUID id;
    private String content;
    private String difficulty;
    private String tags; // JSON array of tags
    private String status;
    private String correctOption; // A, B, C, D
    private UUID createdById;
    private String createdByUsername;
    private String createdByFullName;
    private Integer usageCount;
    private BigDecimal correctRate; // percentage (0.0 to 100.0)
    private List<QuestionOptionResponse> options;
    private Instant createdAt;
    private Instant updatedAt;

    public QuestionResponse() {}

    // Getters and Setters
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public String getContent() { return content; } public void setContent(String content) { this.content = content; }
    public String getDifficulty() { return difficulty; } public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
    public String getTags() { return tags; } public void setTags(String tags) { this.tags = tags; }
    public String getStatus() { return status; } public void setStatus(String status) { this.status = status; }
    public String getCorrectOption() { return correctOption; } public void setCorrectOption(String correctOption) { this.correctOption = correctOption; }
    public UUID getCreatedById() { return createdById; } public void setCreatedById(UUID createdById) { this.createdById = createdById; }
    public String getCreatedByUsername() { return createdByUsername; } public void setCreatedByUsername(String createdByUsername) { this.createdByUsername = createdByUsername; }
    public String getCreatedByFullName() { return createdByFullName; } public void setCreatedByFullName(String createdByFullName) { this.createdByFullName = createdByFullName; }
    public Integer getUsageCount() { return usageCount; } public void setUsageCount(Integer usageCount) { this.usageCount = usageCount; }
    public BigDecimal getCorrectRate() { return correctRate; } public void setCorrectRate(BigDecimal correctRate) { this.correctRate = correctRate; }
    public List<QuestionOptionResponse> getOptions() { return options; } public void setOptions(List<QuestionOptionResponse> options) { this.options = options; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; } public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public static class QuestionOptionResponse {
        private UUID id;
        private String optionKey; // A, B, C, D
        private String optionText;
        private String questionId;
        private Integer displayOrder;

        public QuestionOptionResponse() {}

        // Getters and Setters
        public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
        public String getOptionKey() { return optionKey; } public void setOptionKey(String optionKey) { this.optionKey = optionKey; }
        public String getOptionText() { return optionText; } public void setOptionText(String optionText) { this.optionText = optionText; }
        public String getQuestionId() { return questionId; } public void setQuestionId(String questionId) { this.questionId = questionId; }
        public Integer getDisplayOrder() { return displayOrder; } public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }

        public static QuestionOptionResponseBuilder builder() { return new QuestionOptionResponseBuilder(); }
        public static class QuestionOptionResponseBuilder {
            private QuestionOptionResponse o = new QuestionOptionResponse();
            public QuestionOptionResponseBuilder id(UUID id) { o.setId(id); return this; }
            public QuestionOptionResponseBuilder optionKey(String optionKey) { o.setOptionKey(optionKey); return this; }
            public QuestionOptionResponseBuilder optionText(String optionText) { o.setOptionText(optionText); return this; }
            public QuestionOptionResponseBuilder questionId(String questionId) { o.setQuestionId(questionId); return this; }
            public QuestionOptionResponseBuilder displayOrder(Integer displayOrder) { o.setDisplayOrder(displayOrder); return this; }
            public QuestionOptionResponse build() { return o; }
        }
    }

    public static QuestionResponseBuilder builder() { return new QuestionResponseBuilder(); }
    public static class QuestionResponseBuilder {
        private QuestionResponse r = new QuestionResponse();
        public QuestionResponseBuilder id(UUID id) { r.setId(id); return this; }
        public QuestionResponseBuilder content(String content) { r.setContent(content); return this; }
        public QuestionResponseBuilder difficulty(String difficulty) { r.setDifficulty(difficulty); return this; }
        public QuestionResponseBuilder tags(String tags) { r.setTags(tags); return this; }
        public QuestionResponseBuilder status(String status) { r.setStatus(status); return this; }
        public QuestionResponseBuilder correctOption(String correctOption) { r.setCorrectOption(correctOption); return this; }
        public QuestionResponseBuilder createdById(UUID createdById) { r.setCreatedById(createdById); return this; }
        public QuestionResponseBuilder createdByUsername(String createdByUsername) { r.setCreatedByUsername(createdByUsername); return this; }
        public QuestionResponseBuilder createdByFullName(String createdByFullName) { r.setCreatedByFullName(createdByFullName); return this; }
        public QuestionResponseBuilder usageCount(Integer usageCount) { r.setUsageCount(usageCount); return this; }
        public QuestionResponseBuilder correctRate(BigDecimal correctRate) { r.setCorrectRate(correctRate); return this; }
        public QuestionResponseBuilder options(List<QuestionOptionResponse> options) { r.setOptions(options); return this; }
        public QuestionResponseBuilder createdAt(Instant createdAt) { r.setCreatedAt(createdAt); return this; }
        public QuestionResponseBuilder updatedAt(Instant updatedAt) { r.setUpdatedAt(updatedAt); return this; }
        public QuestionResponse build() { return r; }
    }

    public static QuestionResponse fromEntity(Question question) {
        return QuestionResponse.builder()
                .id(question.getId())
                .content(question.getContent())
                .difficulty(question.getDifficulty().name())
                .tags(question.getTags())
                .status(question.getStatus().name())
                .correctOption(question.getCorrectOption())
                .createdById(question.getCreatedBy().getId())
                .createdByUsername(question.getCreatedBy().getUsername())
                .createdByFullName(question.getCreatedBy().getFullName())
                .usageCount(question.getUsageCount())
                .correctRate(question.getCorrectRate())
                .options(question.getOptions().stream()
                        .map(option -> QuestionOptionResponse.builder()
                                .id(option.getId())
                                .optionKey(option.getOptionKey())
                                .optionText(option.getContent())
                                .questionId(question.getId().toString())
                                .displayOrder(option.getDisplayOrder())
                                .build())
                        .collect(java.util.stream.Collectors.toList()))
                .createdAt(question.getCreatedAt())
                .updatedAt(question.getUpdatedAt())
                .build();
    }
}