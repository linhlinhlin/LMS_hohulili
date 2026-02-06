package com.example.lms.learning_delivery.domain.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for LearningClass aggregate root.
 */
@DisplayName("LearningClass Domain Model Tests")
class LearningClassTest {

    private LearningClass openClass;

    @BeforeEach
    void setUp() {
        openClass = LearningClass.builder()
            .id(UUID.randomUUID())
            .name("Maritime Safety 2025")
            .code("CLASS-001")
            .courseId(UUID.randomUUID())
            .teacherId(UUID.randomUUID())
            .status(LearningClass.ClassStatus.OPEN)
            .maxStudents(30)
            .startDate(Instant.now())
            .endDate(Instant.now().plusSeconds(86400 * 90))
            .build();
    }

    @Nested
    @DisplayName("Status Transition Tests")
    class StatusTransitionTests {

        @Test
        @DisplayName("Should close OPEN class")
        void shouldCloseOpenClass() {
            // When
            openClass.close();

            // Then
            assertThat(openClass.getStatus()).isEqualTo(LearningClass.ClassStatus.CLOSED);
            assertThat(openClass.getUpdatedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should throw close when CANCELLED")
        void shouldThrowCloseWhenCancelled() {
            // Given
            openClass.cancel();

            // When/Then
            assertThatThrownBy(openClass::close)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("cancelled");
        }

        @Test
        @DisplayName("Should archive any class")
        void shouldArchiveAnyClass() {
            // When
            openClass.archive();

            // Then
            assertThat(openClass.getStatus()).isEqualTo(LearningClass.ClassStatus.ARCHIVED);
        }

        @Test
        @DisplayName("Should cancel OPEN class")
        void shouldCancelOpenClass() {
            // When
            openClass.cancel();

            // Then
            assertThat(openClass.getStatus()).isEqualTo(LearningClass.ClassStatus.CANCELLED);
        }

        @Test
        @DisplayName("Should throw cancel when CLOSED")
        void shouldThrowCancelWhenClosed() {
            // Given
            openClass.close();

            // When/Then
            assertThatThrownBy(openClass::cancel)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("closed");
        }

        @Test
        @DisplayName("Should reopen CLOSED class")
        void shouldReopenClosedClass() {
            // Given
            openClass.close();

            // When
            openClass.reopen();

            // Then
            assertThat(openClass.getStatus()).isEqualTo(LearningClass.ClassStatus.OPEN);
        }

        @Test
        @DisplayName("Should reopen ARCHIVED class")
        void shouldReopenArchivedClass() {
            // Given
            openClass.archive();

            // When
            openClass.reopen();

            // Then
            assertThat(openClass.getStatus()).isEqualTo(LearningClass.ClassStatus.OPEN);
        }

        @Test
        @DisplayName("Should throw reopen when OPEN")
        void shouldThrowReopenWhenOpen() {
            assertThatThrownBy(openClass::reopen)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("closed or archived");
        }

        @Test
        @DisplayName("Should throw reopen when CANCELLED")
        void shouldThrowReopenWhenCancelled() {
            // Given
            openClass.cancel();

            // When/Then
            assertThatThrownBy(openClass::reopen)
                .isInstanceOf(IllegalStateException.class);
        }
    }

    @Nested
    @DisplayName("Query Method Tests")
    class QueryMethodTests {

        @Test
        @DisplayName("canEnrollStudents should be true only when OPEN")
        void canEnrollStudentsShouldBeTrueWhenOpen() {
            assertThat(openClass.canEnrollStudents()).isTrue();
        }

        @Test
        @DisplayName("canEnrollStudents should be false when CLOSED")
        void canEnrollStudentsShouldBeFalseWhenClosed() {
            openClass.close();
            assertThat(openClass.canEnrollStudents()).isFalse();
        }

        @Test
        @DisplayName("isActive should be true only when OPEN")
        void isActiveShouldBeTrueWhenOpen() {
            assertThat(openClass.isActive()).isTrue();
            openClass.close();
            assertThat(openClass.isActive()).isFalse();
        }
    }

    @Nested
    @DisplayName("Update Tests")
    class UpdateTests {

        @Test
        @DisplayName("Should update class details selectively")
        void shouldUpdateClassDetailsSelectively() {
            // When
            openClass.update("New Name", null, null, 50, null, null);

            // Then
            assertThat(openClass.getName()).isEqualTo("New Name");
            assertThat(openClass.getCode()).isEqualTo("CLASS-001"); // Unchanged
            assertThat(openClass.getMaxStudents()).isEqualTo(50);
        }

        @Test
        @DisplayName("Should ignore blank name")
        void shouldIgnoreBlankName() {
            // When
            openClass.update("  ", null, null, null, null, null);

            // Then
            assertThat(openClass.getName()).isEqualTo("Maritime Safety 2025");
        }
    }
}
