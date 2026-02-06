package com.example.lms.learning_delivery.domain.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for Enrollment aggregate.
 */
@DisplayName("Enrollment Domain Model Tests")
class EnrollmentTest {

    private Enrollment activeEnrollment;

    @BeforeEach
    void setUp() {
        activeEnrollment = Enrollment.builder()
            .id(UUID.randomUUID())
            .studentId(UUID.randomUUID())
            .status(Enrollment.EnrollmentStatus.ACTIVE)
            .completionPercent(0)
            .enrolledAt(Instant.now())
            .build();
    }

    @Nested
    @DisplayName("Status Transition Tests")
    class StatusTransitionTests {

        @Test
        @DisplayName("Should drop ACTIVE enrollment")
        void shouldDropActiveEnrollment() {
            // When
            activeEnrollment.drop();

            // Then
            assertThat(activeEnrollment.getStatus()).isEqualTo(Enrollment.EnrollmentStatus.DROPPED);
            assertThat(activeEnrollment.getLastAccessedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should throw drop when COMPLETED")
        void shouldThrowDropWhenCompleted() {
            // Given
            activeEnrollment.complete();

            // When/Then
            assertThatThrownBy(activeEnrollment::drop)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("completed");
        }

        @Test
        @DisplayName("Should complete enrollment")
        void shouldCompleteEnrollment() {
            // When
            activeEnrollment.complete();

            // Then
            assertThat(activeEnrollment.getStatus()).isEqualTo(Enrollment.EnrollmentStatus.COMPLETED);
            assertThat(activeEnrollment.getCompletionPercent()).isEqualTo(100);
            assertThat(activeEnrollment.getCompletedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should suspend ACTIVE enrollment")
        void shouldSuspendActiveEnrollment() {
            // When
            activeEnrollment.suspend();

            // Then
            assertThat(activeEnrollment.getStatus()).isEqualTo(Enrollment.EnrollmentStatus.SUSPENDED);
        }

        @Test
        @DisplayName("Should throw suspend when not ACTIVE")
        void shouldThrowSuspendWhenNotActive() {
            // Given
            activeEnrollment.suspend();

            // When/Then
            assertThatThrownBy(activeEnrollment::suspend)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("active");
        }
    }

    @Nested
    @DisplayName("Reactivation Tests")
    class ReactivationTests {

        @Test
        @DisplayName("Should reactivate SUSPENDED enrollment")
        void shouldReactivateSuspendedEnrollment() {
            // Given
            activeEnrollment.suspend();

            // When
            activeEnrollment.reactivate();

            // Then
            assertThat(activeEnrollment.getStatus()).isEqualTo(Enrollment.EnrollmentStatus.ACTIVE);
        }

        @Test
        @DisplayName("Should reactivate DROPPED enrollment")
        void shouldReactivateDroppedEnrollment() {
            // Given
            activeEnrollment.drop();

            // When
            activeEnrollment.reactivate();

            // Then
            assertThat(activeEnrollment.getStatus()).isEqualTo(Enrollment.EnrollmentStatus.ACTIVE);
        }

        @Test
        @DisplayName("Should throw reactivate when ACTIVE")
        void shouldThrowReactivateWhenActive() {
            assertThatThrownBy(activeEnrollment::reactivate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("suspended or dropped");
        }

        @Test
        @DisplayName("Should throw reactivate when COMPLETED")
        void shouldThrowReactivateWhenCompleted() {
            // Given
            activeEnrollment.complete();

            // When/Then
            assertThatThrownBy(activeEnrollment::reactivate)
                .isInstanceOf(IllegalStateException.class);
        }
    }

    @Nested
    @DisplayName("Progress Tests")
    class ProgressTests {

        @Test
        @DisplayName("Should clamp completion percent to 0-100")
        void shouldClampCompletionPercent() {
            // When
            activeEnrollment.updateCompletionPercent(150);
            assertThat(activeEnrollment.getCompletionPercent()).isEqualTo(100);
        }

        @Test
        @DisplayName("Should clamp negative completion percent to 0")
        void shouldClampNegativeCompletionPercent() {
            activeEnrollment.updateCompletionPercent(-50);
            assertThat(activeEnrollment.getCompletionPercent()).isEqualTo(0);
        }

        @Test
        @DisplayName("Should auto-complete at 100%")
        void shouldAutoCompleteAt100Percent() {
            // When
            activeEnrollment.updateCompletionPercent(100);

            // Then
            assertThat(activeEnrollment.getStatus()).isEqualTo(Enrollment.EnrollmentStatus.COMPLETED);
            assertThat(activeEnrollment.getCompletedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should update progress for lesson")
        void shouldUpdateProgressForLesson() {
            // Given
            Enrollment.LessonProgress progress = Enrollment.LessonProgress.builder()
                .status("COMPLETED")
                .watchSeconds(120)
                .grade(95.0)
                .lastActivity(Instant.now())
                .build();

            // When
            activeEnrollment.updateProgress("lesson-1", progress);

            // Then
            assertThat(activeEnrollment.getProgress()).containsKey("lesson-1");
            assertThat(activeEnrollment.getProgress().get("lesson-1").getGrade()).isEqualTo(95.0);
        }
    }

    @Nested
    @DisplayName("Query Method Tests")
    class QueryMethodTests {

        @Test
        @DisplayName("isActive should return true for ACTIVE status")
        void isActiveShouldReturnTrueForActive() {
            assertThat(activeEnrollment.isActive()).isTrue();
        }

        @Test
        @DisplayName("isActive should return false for non-ACTIVE status")
        void isActiveShouldReturnFalseForNonActive() {
            activeEnrollment.drop();
            assertThat(activeEnrollment.isActive()).isFalse();
        }
    }
}
