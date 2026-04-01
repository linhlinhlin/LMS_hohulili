package com.example.lms.assessment.application.dto;

import com.example.lms.assessment.domain.model.QuizAttempt;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * DTO for quiz attempt responses — prevents leaking domain internals to API consumers.
 */
public record QuizAttemptResponse(
        UUID id,
        UUID quizId,
        String status,
        Instant startTime,
        Instant endTime,
        Double score,
        Double maxScore,
        Boolean isPassed,
        List<AttemptItemResponse> items
) {
    public record AttemptItemResponse(
            UUID questionId,
            String selectedOption,
            Boolean isCorrect,
            Double pointsEarned,
            String feedback
    ) {
        public static AttemptItemResponse from(QuizAttempt.AttemptItem item) {
            return new AttemptItemResponse(
                    item.getQuestionId(),
                    item.getSelectedOption(),
                    item.getIsCorrect(),
                    item.getPointsEarned(),
                    item.getFeedback()
            );
        }
    }

    public static QuizAttemptResponse from(QuizAttempt attempt) {
        return new QuizAttemptResponse(
                attempt.getId(),
                attempt.getQuizId(),
                attempt.getStatus() != null ? attempt.getStatus().name() : null,
                attempt.getStartTime(),
                attempt.getEndTime(),
                attempt.getScore(),
                attempt.getMaxScore(),
                attempt.getIsPassed(),
                attempt.getItems() != null
                        ? attempt.getItems().stream().map(AttemptItemResponse::from).toList()
                        : List.of()
        );
    }
}
