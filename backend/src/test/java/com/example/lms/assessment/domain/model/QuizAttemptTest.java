package com.example.lms.assessment.domain.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("QuizAttempt Domain Model Tests")
class QuizAttemptTest {

    @Nested
    @DisplayName("markTimeout()")
    class MarkTimeoutTests {

        @Test
        @DisplayName("Should mark IN_PROGRESS attempt as TIMEOUT")
        void shouldMarkInProgressAsTimeout() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .id(UUID.randomUUID())
                    .quizId(UUID.randomUUID())
                    .studentId(UUID.randomUUID())
                    .status(QuizAttempt.AttemptStatus.IN_PROGRESS)
                    .items(new ArrayList<>())
                    .build();

            attempt.markTimeout();

            assertThat(attempt.getStatus()).isEqualTo(QuizAttempt.AttemptStatus.TIMEOUT);
            assertThat(attempt.getEndTime()).isNotNull();
        }

        @Test
        @DisplayName("Should mark SUBMITTED attempt as TIMEOUT (grace period exceeded)")
        void shouldMarkSubmittedAsTimeout() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .id(UUID.randomUUID())
                    .quizId(UUID.randomUUID())
                    .studentId(UUID.randomUUID())
                    .status(QuizAttempt.AttemptStatus.SUBMITTED)
                    .items(new ArrayList<>())
                    .build();

            attempt.markTimeout();

            assertThat(attempt.getStatus()).isEqualTo(QuizAttempt.AttemptStatus.TIMEOUT);
        }

        @Test
        @DisplayName("Should throw when marking GRADED attempt as timeout")
        void shouldThrowWhenGraded() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .id(UUID.randomUUID())
                    .quizId(UUID.randomUUID())
                    .studentId(UUID.randomUUID())
                    .status(QuizAttempt.AttemptStatus.GRADED)
                    .items(new ArrayList<>())
                    .build();

            assertThatThrownBy(attempt::markTimeout)
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("timeout");
        }

        @Test
        @DisplayName("Should throw when marking TIMEOUT attempt as timeout again")
        void shouldThrowWhenAlreadyTimeout() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .id(UUID.randomUUID())
                    .quizId(UUID.randomUUID())
                    .studentId(UUID.randomUUID())
                    .status(QuizAttempt.AttemptStatus.TIMEOUT)
                    .items(new ArrayList<>())
                    .build();

            assertThatThrownBy(attempt::markTimeout)
                    .isInstanceOf(IllegalStateException.class);
        }
    }

    @Nested
    @DisplayName("finishGrading() score validation")
    class FinishGradingTests {

        @Test
        @DisplayName("Should throw when score exceeds 100")
        void shouldThrowWhenScoreOver100() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .id(UUID.randomUUID())
                    .quizId(UUID.randomUUID())
                    .studentId(UUID.randomUUID())
                    .status(QuizAttempt.AttemptStatus.SUBMITTED)
                    .items(new ArrayList<>())
                    .build();

            assertThatThrownBy(() -> attempt.finishGrading(150.0, true))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("0-100");
        }

        @Test
        @DisplayName("Should throw when score is negative")
        void shouldThrowWhenScoreNegative() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .id(UUID.randomUUID())
                    .quizId(UUID.randomUUID())
                    .studentId(UUID.randomUUID())
                    .status(QuizAttempt.AttemptStatus.SUBMITTED)
                    .items(new ArrayList<>())
                    .build();

            assertThatThrownBy(() -> attempt.finishGrading(-5.0, false))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("0-100");
        }

        @Test
        @DisplayName("Should accept valid scores at boundaries")
        void shouldAcceptValidScores() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .id(UUID.randomUUID())
                    .quizId(UUID.randomUUID())
                    .studentId(UUID.randomUUID())
                    .status(QuizAttempt.AttemptStatus.SUBMITTED)
                    .items(new ArrayList<>())
                    .build();

            attempt.finishGrading(0.0, false);
            assertThat(attempt.getScore()).isEqualTo(0.0);

            attempt.finishGrading(100.0, true);
            assertThat(attempt.getScore()).isEqualTo(100.0);
        }
    }

    @Nested
    @DisplayName("items null safety")
    class ItemsNullSafetyTests {

        @Test
        @DisplayName("Should initialize items as empty list when null")
        void shouldInitializeItemsAsEmptyListWhenNull() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .id(UUID.randomUUID())
                    .quizId(UUID.randomUUID())
                    .studentId(UUID.randomUUID())
                    .status(QuizAttempt.AttemptStatus.IN_PROGRESS)
                    // items deliberately not set (null)
                    .build();

            assertThat(attempt.getItems()).isNotNull();
            assertThat(attempt.getItems()).isEmpty();
        }
    }

    @Nested
    @DisplayName("maxScore field")
    class MaxScoreTests {

        @Test
        @DisplayName("Should default maxScore to 100.0 when null")
        void shouldDefaultMaxScore() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .id(UUID.randomUUID())
                    .quizId(UUID.randomUUID())
                    .studentId(UUID.randomUUID())
                    .status(QuizAttempt.AttemptStatus.IN_PROGRESS)
                    .items(new ArrayList<>())
                    .build();

            assertThat(attempt.getMaxScore()).isEqualTo(100.0);
        }

        @Test
        @DisplayName("Should preserve explicit maxScore value")
        void shouldPreserveExplicitMaxScore() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .id(UUID.randomUUID())
                    .quizId(UUID.randomUUID())
                    .studentId(UUID.randomUUID())
                    .maxScore(50.0)
                    .status(QuizAttempt.AttemptStatus.IN_PROGRESS)
                    .items(new ArrayList<>())
                    .build();

            assertThat(attempt.getMaxScore()).isEqualTo(50.0);
        }
    }
}
