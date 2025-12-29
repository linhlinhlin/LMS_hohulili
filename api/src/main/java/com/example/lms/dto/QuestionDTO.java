package com.example.lms.dto;

import com.example.lms.entity.Question;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.ArrayList;
import java.util.ArrayList;

public class QuestionDTO {

    private UUID id;
    private String content;
    private Question.Difficulty difficulty;
    private String tags;
    private Question.Status status;
    private String correctOption;
    private Integer usageCount;
    private BigDecimal correctRate;
    private List<QuestionOptionDTO> options;
    private UserSummaryDTO createdBy;
    private Instant createdAt;
    private Instant updatedAt;
    private java.util.List<com.example.lms.domain.ContentBlock> blocks;

    public QuestionDTO() {}

    public QuestionDTO(UUID id, String content, Question.Difficulty difficulty, String tags, Question.Status status, String correctOption, Integer usageCount, BigDecimal correctRate, List<QuestionOptionDTO> options, UserSummaryDTO createdBy, Instant createdAt, Instant updatedAt, java.util.List<com.example.lms.domain.ContentBlock> blocks) {
        this.id = id;
        this.content = content;
        this.difficulty = difficulty;
        this.tags = tags;
        this.status = status;
        this.correctOption = correctOption;
        this.usageCount = usageCount;
        this.correctRate = correctRate;
        this.options = options;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.blocks = blocks;
    }

    // Getters and Setters
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public String getContent() { return content; } public void setContent(String content) { this.content = content; }
    public java.util.List<com.example.lms.domain.ContentBlock> getBlocks() { return blocks; } public void setBlocks(java.util.List<com.example.lms.domain.ContentBlock> blocks) { this.blocks = blocks; }
    public Question.Difficulty getDifficulty() { return difficulty; } public void setDifficulty(Question.Difficulty difficulty) { this.difficulty = difficulty; }
    public String getTags() { return tags; } public void setTags(String tags) { this.tags = tags; }
    public Question.Status getStatus() { return status; } public void setStatus(Question.Status status) { this.status = status; }
    public String getCorrectOption() { return correctOption; } public void setCorrectOption(String correctOption) { this.correctOption = correctOption; }
    public Integer getUsageCount() { return usageCount; } public void setUsageCount(Integer usageCount) { this.usageCount = usageCount; }
    public BigDecimal getCorrectRate() { return correctRate; } public void setCorrectRate(BigDecimal correctRate) { this.correctRate = correctRate; }
    public List<QuestionOptionDTO> getOptions() { return options; } public void setOptions(List<QuestionOptionDTO> options) { this.options = options; }
    public UserSummaryDTO getCreatedBy() { return createdBy; } public void setCreatedBy(UserSummaryDTO createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; } public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public static QuestionDTOBuilder builder() { return new QuestionDTOBuilder(); }
    public static class QuestionDTOBuilder {
        private QuestionDTO dto = new QuestionDTO();
        public QuestionDTOBuilder id(UUID id) { dto.setId(id); return this; }
        public QuestionDTOBuilder content(String content) { dto.setContent(content); return this; }
        public QuestionDTOBuilder blocks(java.util.List<com.example.lms.domain.ContentBlock> blocks) { dto.setBlocks(blocks); return this; }
        public QuestionDTOBuilder difficulty(Question.Difficulty difficulty) { dto.setDifficulty(difficulty); return this; }
        public QuestionDTOBuilder tags(String tags) { dto.setTags(tags); return this; }
        public QuestionDTOBuilder status(Question.Status status) { dto.setStatus(status); return this; }
        public QuestionDTOBuilder correctOption(String correctOption) { dto.setCorrectOption(correctOption); return this; }
        public QuestionDTOBuilder usageCount(Integer usageCount) { dto.setUsageCount(usageCount); return this; }
        public QuestionDTOBuilder correctRate(BigDecimal correctRate) { dto.setCorrectRate(correctRate); return this; }
        public QuestionDTOBuilder options(List<QuestionOptionDTO> options) { dto.setOptions(options); return this; }
        public QuestionDTOBuilder createdBy(UserSummaryDTO createdBy) { dto.setCreatedBy(createdBy); return this; }
        public QuestionDTOBuilder createdAt(Instant createdAt) { dto.setCreatedAt(createdAt); return this; }
        public QuestionDTOBuilder updatedAt(Instant updatedAt) { dto.setUpdatedAt(updatedAt); return this; }
        public QuestionDTO build() { return dto; }
    }

    public static QuestionDTO fromEntity(Question question) {
        return QuestionDTO.builder()
                .id(question.getId())
                .content(extractContent(question.getContentBlocks())) // Logic moved here
                .blocks(question.getContentBlocks())
                .difficulty(question.getDifficulty())
                .tags(question.getTags())
                .status(question.getStatus())
                .correctOption(question.getCorrectOption())
                .usageCount(question.getUsageCount())
                .correctRate(question.getCorrectRate())
                .options(question.getOptions() != null ? 
                    question.getOptions().stream()
                        .map(QuestionOptionDTO::fromEntity)
                        .collect(Collectors.toList()) : 
                    new ArrayList<>())
                .createdBy(question.getCreatedBy() != null ? 
                    UserSummaryDTO.fromEntity(question.getCreatedBy()) : null)
                .createdAt(question.getCreatedAt())
                .updatedAt(question.getUpdatedAt())
                .build();
    }

    private static String extractContent(java.util.List<com.example.lms.domain.ContentBlock> blocks) {
        if (blocks == null || blocks.isEmpty()) return "";
        return blocks.stream()
                .filter(b -> "text".equals(b.getType()) && b.getData() != null)
                .map(b -> (String) b.getData().get("html"))
                .findFirst() // or join? Legacy usually implies first main text.
                .orElse("");
    }
}
