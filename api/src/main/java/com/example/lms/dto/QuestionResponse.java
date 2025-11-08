package com.example.lms.dto;

import com.example.lms.entity.Question;
import com.example.lms.entity.QuestionOption;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionOptionResponse {
        private UUID id;
        private String optionKey; // A, B, C, D
        private String optionText;
        private String questionId;
        private Integer displayOrder;
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