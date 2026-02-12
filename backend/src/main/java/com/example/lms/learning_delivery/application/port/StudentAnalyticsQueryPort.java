package com.example.lms.learning_delivery.application.port;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Application-layer query port for student analytics.
 * Abstracts cross-module read-only queries needed by StudentAnalyticsUseCase.
 */
public interface StudentAnalyticsQueryPort {

    long countCompletedCourses(UUID studentId);

    double getAverageCompletionPercent(UUID studentId);

    long countActiveCourses(UUID studentId);

    Double getAverageQuizScorePercent(UUID studentId);

    long countGradedQuizAttempts(UUID studentId);

    Double getAverageAssignmentGradePercent(UUID studentId);

    long countGradedAssignments(UUID studentId);

    long countCertificates(UUID studentId);

    List<GradedAttemptProjection> findRecentGradedQuizAttempts(UUID studentId, int limit);

    List<ActivityDateProjection> findActivityDates(UUID studentId);

    /** Count quiz attempts where score == maxScore (perfect score). */
    long countPerfectQuizAttempts(UUID studentId);

    /** Get pre-calculated streak days from LearningStreak entity. */
    int getStreakDays(UUID studentId);

    record GradedAttemptProjection(double score, double maxScore, Instant submittedAt) {}

    record ActivityDateProjection(Instant lastAccessedAt) {}
}
