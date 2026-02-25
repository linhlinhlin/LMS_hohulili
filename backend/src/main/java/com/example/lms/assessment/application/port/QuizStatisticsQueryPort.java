package com.example.lms.assessment.application.port;

import java.util.List;
import java.util.UUID;

/**
 * CQRS query port for quiz statistics read operations.
 * Isolates the application layer from JPA infrastructure.
 */
public interface QuizStatisticsQueryPort {

    List<QuizInfo> findQuizzesByLessonId(UUID lessonId);

    List<AttemptInfo> findAttemptsByQuizIds(List<UUID> quizIds);

    record QuizInfo(UUID id, String title, Integer passingScore) {}

    record AttemptInfo(UUID id, UUID quizId, String status, Double score) {}
}
