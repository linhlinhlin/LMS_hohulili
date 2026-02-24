package com.example.lms.assessment.domain.model;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

/**
 * QuizQuestion - Represents a question included in a specific quiz.
 * 
 * It links a generic Question (from Question Bank) to a Quiz,
 * adding context like display order and point override.
 */
@Getter
@Builder
public class QuizQuestion {
    private UUID quizId;
    private UUID questionId;
    private Integer displayOrder;
    private Integer points; // Override default question points if needed

    public static QuizQuestion create(UUID quizId, UUID questionId, Integer displayOrder) {
        if (quizId == null || questionId == null) {
            throw new IllegalArgumentException("QuizID và QuestionID là bắt buộc");
        }
        return QuizQuestion.builder()
                .quizId(quizId)
                .questionId(questionId)
                .displayOrder(displayOrder != null ? displayOrder : 999)
                .points(1) // Default points
                .build();
    }

    public void updateOrder(int newOrder) {
        this.displayOrder = newOrder;
    }

    // Manual Getters due to Lombok issues
    public UUID getQuizId() { return quizId; }
    public UUID getQuestionId() { return questionId; }
    public Integer getDisplayOrder() { return displayOrder; }
    public Integer getPoints() { return points; }
}
