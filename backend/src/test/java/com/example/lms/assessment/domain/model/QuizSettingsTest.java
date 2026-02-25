package com.example.lms.assessment.domain.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("QuizSettings Validation Tests")
class QuizSettingsTest {

    @Nested
    @DisplayName("Valid settings")
    class ValidSettings {

        @Test
        @DisplayName("Should create settings with all valid values")
        void shouldCreateWithValidValues() {
            Quiz.QuizSettings settings = Quiz.QuizSettings.builder()
                    .timeLimitMinutes(30)
                    .maxAttempts(3)
                    .passingScore(70)
                    .shuffleQuestions(true)
                    .build();

            assertThat(settings.timeLimitMinutes()).isEqualTo(30);
            assertThat(settings.maxAttempts()).isEqualTo(3);
            assertThat(settings.passingScore()).isEqualTo(70);
        }

        @Test
        @DisplayName("Should allow null timeLimitMinutes (no time limit)")
        void shouldAllowNullTimeLimit() {
            Quiz.QuizSettings settings = Quiz.QuizSettings.builder()
                    .maxAttempts(3)
                    .passingScore(70)
                    .build();

            assertThat(settings.timeLimitMinutes()).isNull();
        }

        @Test
        @DisplayName("Should allow null maxAttempts and passingScore")
        void shouldAllowNullMaxAttemptsAndPassingScore() {
            Quiz.QuizSettings settings = Quiz.QuizSettings.builder().build();

            assertThat(settings.maxAttempts()).isNull();
            assertThat(settings.passingScore()).isNull();
        }

        @Test
        @DisplayName("Should allow passingScore at boundaries (0 and 100)")
        void shouldAllowPassingScoreBoundaries() {
            assertThat(Quiz.QuizSettings.builder().passingScore(0).build().passingScore()).isEqualTo(0);
            assertThat(Quiz.QuizSettings.builder().passingScore(100).build().passingScore()).isEqualTo(100);
        }

        @Test
        @DisplayName("Should allow valid availability window")
        void shouldAllowValidAvailabilityWindow() {
            Instant from = Instant.now();
            Instant due = from.plusSeconds(3600);
            Instant lock = from.plusSeconds(7200);

            Quiz.QuizSettings settings = Quiz.QuizSettings.builder()
                    .availableFrom(from)
                    .dueAt(due)
                    .lockAt(lock)
                    .build();

            assertThat(settings.availableFrom()).isEqualTo(from);
            assertThat(settings.dueAt()).isEqualTo(due);
            assertThat(settings.lockAt()).isEqualTo(lock);
        }
    }

    @Nested
    @DisplayName("Invalid settings")
    class InvalidSettings {

        @Test
        @DisplayName("Should reject negative timeLimitMinutes")
        void shouldRejectNegativeTimeLimit() {
            assertThatThrownBy(() -> Quiz.QuizSettings.builder().timeLimitMinutes(-5).build())
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("lớn hơn 0");
        }

        @Test
        @DisplayName("Should reject zero timeLimitMinutes")
        void shouldRejectZeroTimeLimit() {
            assertThatThrownBy(() -> Quiz.QuizSettings.builder().timeLimitMinutes(0).build())
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("lớn hơn 0");
        }

        @Test
        @DisplayName("Should reject maxAttempts <= 0")
        void shouldRejectInvalidMaxAttempts() {
            assertThatThrownBy(() -> Quiz.QuizSettings.builder().maxAttempts(0).build())
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("lớn hơn 0");

            assertThatThrownBy(() -> Quiz.QuizSettings.builder().maxAttempts(-1).build())
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("lớn hơn 0");
        }

        @Test
        @DisplayName("Should reject passingScore out of 0-100 range")
        void shouldRejectInvalidPassingScore() {
            assertThatThrownBy(() -> Quiz.QuizSettings.builder().passingScore(-1).build())
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("0-100");

            assertThatThrownBy(() -> Quiz.QuizSettings.builder().passingScore(101).build())
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("0-100");
        }

        @Test
        @DisplayName("Should reject availableFrom after lockAt")
        void shouldRejectAvailableFromAfterLockAt() {
            Instant lockAt = Instant.now();
            Instant availableFrom = lockAt.plusSeconds(3600); // after lockAt

            assertThatThrownBy(() -> Quiz.QuizSettings.builder()
                    .availableFrom(availableFrom)
                    .lockAt(lockAt)
                    .build())
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("trước thời gian khóa");
        }

        @Test
        @DisplayName("Should reject dueAt before availableFrom")
        void shouldRejectDueAtBeforeAvailableFrom() {
            Instant availableFrom = Instant.now().plusSeconds(3600);
            Instant dueAt = Instant.now(); // before availableFrom

            assertThatThrownBy(() -> Quiz.QuizSettings.builder()
                    .availableFrom(availableFrom)
                    .dueAt(dueAt)
                    .build())
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("sau thời gian mở");
        }

        @Test
        @DisplayName("Should reject dueAt after lockAt")
        void shouldRejectDueAtAfterLockAt() {
            Instant lockAt = Instant.now();
            Instant dueAt = lockAt.plusSeconds(3600); // after lockAt

            assertThatThrownBy(() -> Quiz.QuizSettings.builder()
                    .dueAt(dueAt)
                    .lockAt(lockAt)
                    .build())
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("trước thời gian khóa");
        }
    }
}
