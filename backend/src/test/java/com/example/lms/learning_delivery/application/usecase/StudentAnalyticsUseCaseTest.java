package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.application.port.StudentAnalyticsQueryPort;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("StudentAnalyticsUseCase")
class StudentAnalyticsUseCaseTest {

    @Mock
    private StudentAnalyticsQueryPort analyticsQuery;

    @InjectMocks
    private StudentAnalyticsUseCase useCase;

    private final UUID studentId = UUID.randomUUID();

    private void stubAllEmpty() {
        when(analyticsQuery.countCompletedCourses(studentId)).thenReturn(0L);
        when(analyticsQuery.getAverageCompletionPercent(studentId)).thenReturn(0.0);
        when(analyticsQuery.countActiveCourses(studentId)).thenReturn(0L);
        when(analyticsQuery.getAverageQuizScorePercent(studentId)).thenReturn(null);
        when(analyticsQuery.countGradedQuizAttempts(studentId)).thenReturn(0L);
        when(analyticsQuery.getAverageAssignmentGradePercent(studentId)).thenReturn(null);
        when(analyticsQuery.countGradedAssignments(studentId)).thenReturn(0L);
        when(analyticsQuery.countCertificates(studentId)).thenReturn(0L);
        when(analyticsQuery.findRecentGradedQuizAttempts(studentId, 10)).thenReturn(Collections.emptyList());
        when(analyticsQuery.getStreakDays(studentId)).thenReturn(0);
    }

    @Test
    @DisplayName("getAnalytics - no data returns zeros")
    void getAnalytics_noData_returnsZeros() {
        stubAllEmpty();

        StudentAnalyticsUseCase.StudentAnalyticsResponse result = useCase.getAnalytics(studentId);

        assertThat(result.coursesCompleted()).isZero();
        assertThat(result.activeCourses()).isZero();
        assertThat(result.totalQuizAttempts()).isZero();
        assertThat(result.totalAssignmentsSubmitted()).isZero();
        assertThat(result.certificatesEarned()).isZero();
        assertThat(result.averageScore()).isZero();
        assertThat(result.totalStudyTimeHours()).isZero();
        assertThat(result.learningStreakDays()).isZero();
        assertThat(result.averageCompletionPercent()).isZero();
        assertThat(result.performanceTrend()).isEmpty();
    }

    @Test
    @DisplayName("getAnalytics - with courses returns completed count")
    void getAnalytics_withCourses_returnsCompletedCount() {
        stubAllEmpty();

        when(analyticsQuery.countCompletedCourses(studentId)).thenReturn(5L);
        when(analyticsQuery.countActiveCourses(studentId)).thenReturn(2L);
        when(analyticsQuery.getAverageCompletionPercent(studentId)).thenReturn(65.0);

        StudentAnalyticsUseCase.StudentAnalyticsResponse result = useCase.getAnalytics(studentId);

        assertThat(result.coursesCompleted()).isEqualTo(5L);
        assertThat(result.activeCourses()).isEqualTo(2L);
        assertThat(result.averageCompletionPercent()).isEqualTo(65.0);
    }

    @Test
    @DisplayName("getAnalytics - combines quiz and assignment averages")
    void getAnalytics_combinesQuizAndAssignmentAverages() {
        stubAllEmpty();

        when(analyticsQuery.getAverageQuizScorePercent(studentId)).thenReturn(80.0);
        when(analyticsQuery.getAverageAssignmentGradePercent(studentId)).thenReturn(90.0);

        StudentAnalyticsUseCase.StudentAnalyticsResponse result = useCase.getAnalytics(studentId);

        // (80 + 90) / 2 = 85.0
        assertThat(result.averageScore()).isEqualTo(85.0);
    }

    @Test
    @DisplayName("getAnalytics - quiz average only when no assignments")
    void getAnalytics_quizAverageOnly_whenNoAssignments() {
        stubAllEmpty();

        when(analyticsQuery.getAverageQuizScorePercent(studentId)).thenReturn(72.5);
        when(analyticsQuery.getAverageAssignmentGradePercent(studentId)).thenReturn(null);

        StudentAnalyticsUseCase.StudentAnalyticsResponse result = useCase.getAnalytics(studentId);

        assertThat(result.averageScore()).isEqualTo(72.5);
    }

    @Test
    @DisplayName("getAnalytics - assignment average only when no quizzes")
    void getAnalytics_assignmentAverageOnly_whenNoQuizzes() {
        stubAllEmpty();

        when(analyticsQuery.getAverageQuizScorePercent(studentId)).thenReturn(null);
        when(analyticsQuery.getAverageAssignmentGradePercent(studentId)).thenReturn(88.0);

        StudentAnalyticsUseCase.StudentAnalyticsResponse result = useCase.getAnalytics(studentId);

        assertThat(result.averageScore()).isEqualTo(88.0);
    }

    @Test
    @DisplayName("getAnalytics - calculates study time from quiz and assignment counts")
    void getAnalytics_calculatesStudyTime() {
        stubAllEmpty();

        // 4 quizzes * 15min + 2 assignments * 30min = 60 + 60 = 120 min = 2.0 hours
        when(analyticsQuery.countGradedQuizAttempts(studentId)).thenReturn(4L);
        when(analyticsQuery.countGradedAssignments(studentId)).thenReturn(2L);

        StudentAnalyticsUseCase.StudentAnalyticsResponse result = useCase.getAnalytics(studentId);

        assertThat(result.totalStudyTimeHours()).isEqualTo(2.0);
        assertThat(result.totalQuizAttempts()).isEqualTo(4L);
        assertThat(result.totalAssignmentsSubmitted()).isEqualTo(2L);
    }

    @Test
    @DisplayName("getAnalytics - counts certificates earned")
    void getAnalytics_countsCertificates() {
        stubAllEmpty();

        when(analyticsQuery.countCertificates(studentId)).thenReturn(3L);

        StudentAnalyticsUseCase.StudentAnalyticsResponse result = useCase.getAnalytics(studentId);

        assertThat(result.certificatesEarned()).isEqualTo(3L);
    }

    @Test
    @DisplayName("getAnalytics - builds performance trend from graded quiz attempts")
    void getAnalytics_buildsPerformanceTrend() {
        stubAllEmpty();

        ZoneId zone = ZoneId.systemDefault();
        Instant day1 = LocalDate.of(2026, 1, 10).atStartOfDay(zone).toInstant();
        Instant day2 = LocalDate.of(2026, 1, 15).atStartOfDay(zone).toInstant();
        Instant day3 = LocalDate.of(2026, 1, 20).atStartOfDay(zone).toInstant();

        // findRecentGradedQuizAttempts returns newest first (DESC order)
        var attempt3 = new StudentAnalyticsQueryPort.GradedAttemptProjection(9.0, 10.0, day3);
        var attempt2 = new StudentAnalyticsQueryPort.GradedAttemptProjection(7.0, 10.0, day2);
        var attempt1 = new StudentAnalyticsQueryPort.GradedAttemptProjection(5.0, 10.0, day1);

        when(analyticsQuery.findRecentGradedQuizAttempts(studentId, 10))
                .thenReturn(List.of(attempt3, attempt2, attempt1));

        StudentAnalyticsUseCase.StudentAnalyticsResponse result = useCase.getAnalytics(studentId);

        // Trend is reversed to chronological order (oldest first)
        assertThat(result.performanceTrend()).hasSize(3);

        // First item = oldest (attempt1): 5/10 = 50%
        assertThat(result.performanceTrend().get(0).date()).isEqualTo("2026-01-10");
        assertThat(result.performanceTrend().get(0).score()).isEqualTo(50.0);
        assertThat(result.performanceTrend().get(0).type()).isEqualTo("quiz");

        // Second item (attempt2): 7/10 = 70%
        assertThat(result.performanceTrend().get(1).date()).isEqualTo("2026-01-15");
        assertThat(result.performanceTrend().get(1).score()).isEqualTo(70.0);

        // Third item = newest (attempt3): 9/10 = 90%
        assertThat(result.performanceTrend().get(2).date()).isEqualTo("2026-01-20");
        assertThat(result.performanceTrend().get(2).score()).isEqualTo(90.0);
    }
}
