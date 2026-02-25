package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.port.QuizStatisticsQueryPort;
import com.example.lms.assessment.application.port.QuizStatisticsQueryPort.AttemptInfo;
import com.example.lms.assessment.application.port.QuizStatisticsQueryPort.QuizInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Query use case: calculates quiz statistics for a lesson.
 * Returns per-quiz stats when multiple quizzes exist for a lesson.
 * Extracted from QuizControllerV3 to follow Clean Architecture (business logic in application layer).
 */
@Service
@RequiredArgsConstructor
public class GetQuizStatisticsUseCase {

    private final QuizStatisticsQueryPort queryPort;

    @Transactional(readOnly = true)
    public Map<String, Object> execute(UUID lessonId) {
        List<QuizInfo> quizzes = queryPort.findQuizzesByLessonId(lessonId);
        if (quizzes.isEmpty()) {
            return emptyStats();
        }

        List<UUID> quizIds = quizzes.stream().map(QuizInfo::id).collect(Collectors.toList());
        List<AttemptInfo> allAttempts = queryPort.findAttemptsByQuizIds(quizIds);
        Map<UUID, List<AttemptInfo>> attemptsByQuiz = allAttempts.stream()
                .collect(Collectors.groupingBy(AttemptInfo::quizId));

        // Build per-quiz stats
        List<Map<String, Object>> quizStatsList = new ArrayList<>();
        for (QuizInfo quiz : quizzes) {
            List<AttemptInfo> attempts = attemptsByQuiz.getOrDefault(quiz.id(), List.of());
            quizStatsList.add(buildSingleQuizStats(quiz, attempts));
        }

        // Aggregated totals
        double overallAvg = allAttempts.stream()
                .filter(a -> a.score() != null)
                .mapToDouble(AttemptInfo::score)
                .average().orElse(0);

        Map<String, Object> result = new HashMap<>();
        result.put("quizzes", quizStatsList);
        result.put("totalAttempts", allAttempts.size());
        result.put("averageScore", Math.round(overallAvg * 10) / 10.0);

        // Backward compat: also include first quiz's data at top level
        if (!quizStatsList.isEmpty()) {
            Map<String, Object> first = quizStatsList.get(0);
            result.put("quizId", first.get("quizId"));
            result.put("quizTitle", first.get("quizTitle"));
            result.put("completedAttempts", first.get("completedAttempts"));
            result.put("passRate", first.get("passRate"));
            result.put("passingScore", first.get("passingScore"));
        }

        return result;
    }

    private Map<String, Object> buildSingleQuizStats(QuizInfo quiz, List<AttemptInfo> attempts) {
        int totalAttempts = attempts.size();
        long completedAttempts = attempts.stream()
                .filter(a -> "GRADED".equals(a.status()) || "SUBMITTED".equals(a.status()))
                .count();
        double avgScore = attempts.stream()
                .filter(a -> a.score() != null)
                .mapToDouble(AttemptInfo::score)
                .average().orElse(0);

        int passingScore = quiz.passingScore() != null ? quiz.passingScore() : 60;
        long passedAttempts = attempts.stream()
                .filter(a -> a.score() != null && a.score() >= passingScore)
                .count();
        double passRate = totalAttempts > 0 ? (double) passedAttempts / totalAttempts * 100 : 0;

        Map<String, Object> stats = new HashMap<>();
        stats.put("quizId", quiz.id().toString());
        stats.put("quizTitle", quiz.title());
        stats.put("totalAttempts", totalAttempts);
        stats.put("completedAttempts", completedAttempts);
        stats.put("averageScore", Math.round(avgScore * 10) / 10.0);
        stats.put("passRate", Math.round(passRate * 10) / 10.0);
        stats.put("passingScore", passingScore);

        return stats;
    }

    private Map<String, Object> emptyStats() {
        Map<String, Object> empty = new HashMap<>();
        empty.put("totalAttempts", 0);
        empty.put("completedAttempts", 0);
        empty.put("averageScore", 0.0);
        empty.put("passRate", 0.0);
        empty.put("quizzes", List.of());
        return empty;
    }
}
