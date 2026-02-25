package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.port.QuizStatisticsQueryPort;
import com.example.lms.assessment.application.port.QuizStatisticsQueryPort.AttemptInfo;
import com.example.lms.assessment.application.port.QuizStatisticsQueryPort.QuizInfo;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("GetQuizStatisticsUseCase Tests")
class GetQuizStatisticsUseCaseTest {

    @Mock
    private QuizStatisticsQueryPort queryPort;

    @InjectMocks
    private GetQuizStatisticsUseCase useCase;

    private final UUID lessonId = UUID.randomUUID();
    private final UUID quizId = UUID.randomUUID();

    @Test
    @DisplayName("Should return empty stats when no quizzes for lesson")
    void shouldReturnEmptyWhenNoQuizzes() {
        when(queryPort.findQuizzesByLessonId(lessonId)).thenReturn(List.of());

        Map<String, Object> stats = useCase.execute(lessonId);

        assertThat(stats.get("totalAttempts")).isEqualTo(0);
        assertThat(stats.get("completedAttempts")).isEqualTo(0);
        assertThat(stats.get("averageScore")).isEqualTo(0.0);
        assertThat(stats.get("passRate")).isEqualTo(0.0);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> quizzes = (List<Map<String, Object>>) stats.get("quizzes");
        assertThat(quizzes).isEmpty();
    }

    @Test
    @DisplayName("Should return empty stats when no attempts")
    void shouldReturnEmptyWhenNoAttempts() {
        when(queryPort.findQuizzesByLessonId(lessonId))
                .thenReturn(List.of(new QuizInfo(quizId, "Quiz 1", 70)));
        when(queryPort.findAttemptsByQuizIds(anyList())).thenReturn(List.of());

        Map<String, Object> stats = useCase.execute(lessonId);

        assertThat(stats.get("totalAttempts")).isEqualTo(0);
        assertThat(stats.get("passRate")).isEqualTo(0.0);
        assertThat(stats.get("quizTitle")).isEqualTo("Quiz 1");
    }

    @Test
    @DisplayName("Should calculate correct passRate for mixed results")
    void shouldCalculatePassRate() {
        when(queryPort.findQuizzesByLessonId(lessonId))
                .thenReturn(List.of(new QuizInfo(quizId, "Quiz 1", 70)));
        when(queryPort.findAttemptsByQuizIds(anyList()))
                .thenReturn(List.of(
                        new AttemptInfo(UUID.randomUUID(), quizId, "SUBMITTED", 80.0), // passed
                        new AttemptInfo(UUID.randomUUID(), quizId, "SUBMITTED", 90.0), // passed
                        new AttemptInfo(UUID.randomUUID(), quizId, "SUBMITTED", 50.0), // failed
                        new AttemptInfo(UUID.randomUUID(), quizId, "GRADED", 60.0)     // failed
                ));

        Map<String, Object> stats = useCase.execute(lessonId);

        assertThat(stats.get("totalAttempts")).isEqualTo(4);
        assertThat((long) stats.get("completedAttempts")).isEqualTo(4L);
        assertThat(stats.get("passRate")).isEqualTo(50.0); // 2/4 = 50%
        assertThat(stats.get("averageScore")).isEqualTo(70.0); // (80+90+50+60)/4 = 70
        assertThat(stats.get("passingScore")).isEqualTo(70);
    }

    @Test
    @DisplayName("Should use default passingScore 60 when quiz has null")
    void shouldUseDefaultPassingScore() {
        when(queryPort.findQuizzesByLessonId(lessonId))
                .thenReturn(List.of(new QuizInfo(quizId, "Quiz 1", null)));
        when(queryPort.findAttemptsByQuizIds(anyList()))
                .thenReturn(List.of(
                        new AttemptInfo(UUID.randomUUID(), quizId, "SUBMITTED", 55.0), // failed (< 60)
                        new AttemptInfo(UUID.randomUUID(), quizId, "SUBMITTED", 65.0)  // passed (>= 60)
                ));

        Map<String, Object> stats = useCase.execute(lessonId);

        assertThat(stats.get("passingScore")).isEqualTo(60);
        assertThat(stats.get("passRate")).isEqualTo(50.0); // 1/2 = 50%
    }

    @Test
    @DisplayName("Should return per-quiz stats for multiple quizzes")
    void shouldReturnPerQuizStatsForMultipleQuizzes() {
        UUID quiz2Id = UUID.randomUUID();
        when(queryPort.findQuizzesByLessonId(lessonId))
                .thenReturn(List.of(
                        new QuizInfo(quizId, "Quiz 1", 70),
                        new QuizInfo(quiz2Id, "Quiz 2", 50)));
        when(queryPort.findAttemptsByQuizIds(anyList()))
                .thenReturn(List.of(
                        new AttemptInfo(UUID.randomUUID(), quizId, "SUBMITTED", 80.0),
                        new AttemptInfo(UUID.randomUUID(), quizId, "SUBMITTED", 60.0),
                        new AttemptInfo(UUID.randomUUID(), quiz2Id, "SUBMITTED", 40.0),
                        new AttemptInfo(UUID.randomUUID(), quiz2Id, "SUBMITTED", 90.0)
                ));

        Map<String, Object> stats = useCase.execute(lessonId);

        assertThat(stats.get("totalAttempts")).isEqualTo(4);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> quizzes = (List<Map<String, Object>>) stats.get("quizzes");
        assertThat(quizzes).hasSize(2);

        // Quiz 1: passing=70 → 80 passes, 60 fails → passRate=50%
        Map<String, Object> q1Stats = quizzes.get(0);
        assertThat(q1Stats.get("quizTitle")).isEqualTo("Quiz 1");
        assertThat(q1Stats.get("totalAttempts")).isEqualTo(2);
        assertThat(q1Stats.get("passRate")).isEqualTo(50.0);

        // Quiz 2: passing=50 → 40 fails, 90 passes → passRate=50%
        Map<String, Object> q2Stats = quizzes.get(1);
        assertThat(q2Stats.get("quizTitle")).isEqualTo("Quiz 2");
        assertThat(q2Stats.get("totalAttempts")).isEqualTo(2);
        assertThat(q2Stats.get("passRate")).isEqualTo(50.0);
    }

    @Test
    @DisplayName("Should use each quiz's passing score independently")
    void shouldUseEachQuizPassingScoreIndependently() {
        UUID quiz2Id = UUID.randomUUID();
        when(queryPort.findQuizzesByLessonId(lessonId))
                .thenReturn(List.of(
                        new QuizInfo(quizId, "Easy Quiz", 30),
                        new QuizInfo(quiz2Id, "Hard Quiz", 90)));
        when(queryPort.findAttemptsByQuizIds(anyList()))
                .thenReturn(List.of(
                        new AttemptInfo(UUID.randomUUID(), quizId, "SUBMITTED", 50.0), // passes easy
                        new AttemptInfo(UUID.randomUUID(), quiz2Id, "SUBMITTED", 50.0)  // fails hard
                ));

        Map<String, Object> stats = useCase.execute(lessonId);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> quizzes = (List<Map<String, Object>>) stats.get("quizzes");

        // Easy quiz: 50 >= 30 → 100% pass rate
        assertThat(quizzes.get(0).get("passRate")).isEqualTo(100.0);
        // Hard quiz: 50 < 90 → 0% pass rate
        assertThat(quizzes.get(1).get("passRate")).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Should handle attempts with null score in average calculation")
    void shouldHandleNullScoresInAverage() {
        when(queryPort.findQuizzesByLessonId(lessonId))
                .thenReturn(List.of(new QuizInfo(quizId, "Quiz 1", 70)));
        when(queryPort.findAttemptsByQuizIds(anyList()))
                .thenReturn(List.of(
                        new AttemptInfo(UUID.randomUUID(), quizId, "SUBMITTED", 80.0),
                        new AttemptInfo(UUID.randomUUID(), quizId, "IN_PROGRESS", null) // no score yet
                ));

        Map<String, Object> stats = useCase.execute(lessonId);

        assertThat(stats.get("totalAttempts")).isEqualTo(2);
        assertThat(stats.get("averageScore")).isEqualTo(80.0); // only 1 scored attempt
    }
}
