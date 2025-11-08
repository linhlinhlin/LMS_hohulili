package com.example.lms.dto;

import com.example.lms.entity.Question;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
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

    public static QuestionDTO fromEntity(Question question) {
        return QuestionDTO.builder()
                .id(question.getId())
                .content(question.getContent())
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
                    List.of())
                .createdBy(question.getCreatedBy() != null ? 
                    UserSummaryDTO.fromEntity(question.getCreatedBy()) : null)
                .createdAt(question.getCreatedAt())
                .updatedAt(question.getUpdatedAt())
                .build();
    }
}