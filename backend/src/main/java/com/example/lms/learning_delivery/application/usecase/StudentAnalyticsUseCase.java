package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.application.port.StudentAnalyticsQueryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudentAnalyticsUseCase {

    private final StudentAnalyticsQueryPort analyticsQuery;

    public StudentAnalyticsResponse getAnalytics(UUID studentId) {
        // Course stats
        long coursesCompleted = analyticsQuery.countCompletedCourses(studentId);
        double avgCompletion = analyticsQuery.getAverageCompletionPercent(studentId);
        long activeCourses = analyticsQuery.countActiveCourses(studentId);

        // Quiz stats
        Double quizAvg = analyticsQuery.getAverageQuizScorePercent(studentId);
        long totalQuizAttempts = analyticsQuery.countGradedQuizAttempts(studentId);

        // Assignment stats
        Double assignmentAvg = analyticsQuery.getAverageAssignmentGradePercent(studentId);
        long totalAssignments = analyticsQuery.countGradedAssignments(studentId);

        // Certificate count
        long certificates = analyticsQuery.countCertificates(studentId);

        // Average score (combine quiz + assignment averages)
        double averageScore = calculateCombinedAverage(quizAvg, assignmentAvg);

        // Study time estimate (rough: quiz ~15min, assignment ~30min)
        double studyTimeHours = (totalQuizAttempts * 15.0 + totalAssignments * 30.0) / 60.0;

        // Learning streak (from pre-calculated LearningStreak entity, updated by GamificationUseCase)
        int streakDays = analyticsQuery.getStreakDays(studentId);

        // Performance trend (last 10 graded quiz attempts)
        List<PerformanceTrendItem> trend = buildPerformanceTrend(studentId);

        return new StudentAnalyticsResponse(
                Math.round(studyTimeHours * 10.0) / 10.0,
                coursesCompleted,
                Math.round(averageScore * 10.0) / 10.0,
                streakDays,
                activeCourses,
                totalQuizAttempts,
                totalAssignments,
                certificates,
                Math.round(avgCompletion * 10.0) / 10.0,
                trend
        );
    }

    private double calculateCombinedAverage(Double quizAvg, Double assignmentAvg) {
        if (quizAvg != null && assignmentAvg != null) {
            return (quizAvg + assignmentAvg) / 2.0;
        } else if (quizAvg != null) {
            return quizAvg;
        } else if (assignmentAvg != null) {
            return assignmentAvg;
        }
        return 0.0;
    }

    private List<PerformanceTrendItem> buildPerformanceTrend(UUID studentId) {
        List<StudentAnalyticsQueryPort.GradedAttemptProjection> graded = analyticsQuery.findRecentGradedQuizAttempts(studentId, 10);
        List<PerformanceTrendItem> trend = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        ZoneId zone = ZoneId.systemDefault();

        // Reverse order (oldest first)
        List<StudentAnalyticsQueryPort.GradedAttemptProjection> reversed = new ArrayList<>(graded);
        Collections.reverse(reversed);

        for (var qa : reversed) {
            double scorePercent = (qa.maxScore() > 0)
                    ? (qa.score() / qa.maxScore() * 100.0)
                    : 0.0;
            String date = qa.submittedAt() != null
                    ? qa.submittedAt().atZone(zone).toLocalDate().format(fmt)
                    : "N/A";

            trend.add(new PerformanceTrendItem(date, Math.round(scorePercent * 10.0) / 10.0, "quiz", "Quiz"));
        }

        return trend;
    }

    // Response DTOs
    public record StudentAnalyticsResponse(
            double totalStudyTimeHours,
            long coursesCompleted,
            double averageScore,
            int learningStreakDays,
            long activeCourses,
            long totalQuizAttempts,
            long totalAssignmentsSubmitted,
            long certificatesEarned,
            double averageCompletionPercent,
            List<PerformanceTrendItem> performanceTrend
    ) {}

    public record PerformanceTrendItem(String date, double score, String type, String label) {}
}
