package com.example.lms.assessment.domain.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for Assignment aggregate root.
 */
@DisplayName("Assignment Domain Model Tests")
class AssignmentTest {

    private UUID lessonId;

    @BeforeEach
    void setUp() {
        lessonId = UUID.randomUUID();
    }

    @Nested
    @DisplayName("Factory Method Tests")
    class FactoryMethodTests {

        @Test
        @DisplayName("Should create assignment with defaults")
        void shouldCreateWithDefaults() {
            // When
            Assignment assignment = Assignment.create(UUID.randomUUID(), lessonId, "Essay 1", "Write an essay", "Instructions", null, null);

            // Then
            assertThat(assignment.getId()).isNotNull();
            assertThat(assignment.getLessonId()).isEqualTo(lessonId);
            assertThat(assignment.getTitle()).isEqualTo("Essay 1");
            assertThat(assignment.getDescription()).isEqualTo("Write an essay");
            assertThat(assignment.getStatus()).isEqualTo(Assignment.AssignmentStatus.DRAFT);
            assertThat(assignment.getType()).isEqualTo(Assignment.AssignmentType.ESSAY);
            assertThat(assignment.getMaxScore()).isEqualTo(100);
            assertThat(assignment.getCreatedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should create with explicit type and maxScore")
        void shouldCreateWithExplicitTypeAndMaxScore() {
            // When
            Assignment assignment = Assignment.create(UUID.randomUUID(), lessonId, "Project 1", "desc", "instr",
                Assignment.AssignmentType.PROJECT, 200);

            // Then
            assertThat(assignment.getType()).isEqualTo(Assignment.AssignmentType.PROJECT);
            assertThat(assignment.getMaxScore()).isEqualTo(200);
        }

        @Test
        @DisplayName("Should throw on null title")
        void shouldThrowOnNullTitle() {
            assertThatThrownBy(() -> Assignment.create(UUID.randomUUID(), lessonId, null, "desc", "instr", null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("title");
        }

        @Test
        @DisplayName("Should throw on blank title")
        void shouldThrowOnBlankTitle() {
            assertThatThrownBy(() -> Assignment.create(UUID.randomUUID(), lessonId, "   ", "desc", "instr", null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("title");
        }
    }

    @Nested
    @DisplayName("Lifecycle Tests")
    class LifecycleTests {

        @Test
        @DisplayName("Should publish DRAFT assignment")
        void shouldPublishDraftAssignment() {
            // Given
            Assignment assignment = Assignment.create(UUID.randomUUID(), lessonId, "Task 1", "d", "i", null, null);

            // When
            assignment.publish();

            // Then
            assertThat(assignment.getStatus()).isEqualTo(Assignment.AssignmentStatus.PUBLISHED);
        }

        @Test
        @DisplayName("Should throw publish when CLOSED")
        void shouldThrowPublishWhenClosed() {
            // Given
            Assignment assignment = Assignment.create(UUID.randomUUID(), lessonId, "Task 1", "d", "i", null, null);
            assignment.close();

            // When/Then
            assertThatThrownBy(assignment::publish)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("closed");
        }

        @Test
        @DisplayName("Should close any assignment")
        void shouldCloseAnyAssignment() {
            // Given
            Assignment assignment = Assignment.create(UUID.randomUUID(), lessonId, "Task 1", "d", "i", null, null);
            assignment.publish();

            // When
            assignment.close();

            // Then
            assertThat(assignment.getStatus()).isEqualTo(Assignment.AssignmentStatus.CLOSED);
        }
    }

    @Nested
    @DisplayName("Business Logic Tests")
    class BusinessLogicTests {

        @Test
        @DisplayName("Should set future due date")
        void shouldSetFutureDueDate() {
            // Given
            Assignment assignment = Assignment.create(UUID.randomUUID(), lessonId, "Task 1", "d", "i", null, null);
            Instant future = Instant.now().plusSeconds(86400);

            // When
            assignment.setDueDate(future);

            // Then
            assertThat(assignment.getDueDate()).isEqualTo(future);
        }

        @Test
        @DisplayName("Should throw when setting past due date")
        void shouldThrowWhenSettingPastDueDate() {
            // Given
            Assignment assignment = Assignment.create(UUID.randomUUID(), lessonId, "Task 1", "d", "i", null, null);
            Instant past = Instant.now().minusSeconds(86400);

            // When/Then
            assertThatThrownBy(() -> assignment.setDueDate(past))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("future");
        }

        @Test
        @DisplayName("Should allow null due date")
        void shouldAllowNullDueDate() {
            // Given
            Assignment assignment = Assignment.create(UUID.randomUUID(), lessonId, "Task 1", "d", "i", null, null);

            // When
            assignment.setDueDate(null);

            // Then
            assertThat(assignment.getDueDate()).isNull();
        }

        @Test
        @DisplayName("isOpen should be true when published with future due date")
        void isOpenShouldBeTrueWhenPublishedWithFutureDueDate() {
            // Given
            Assignment assignment = Assignment.create(UUID.randomUUID(), lessonId, "Task 1", "d", "i", null, null);
            assignment.publish();
            assignment.setDueDate(Instant.now().plusSeconds(86400));

            // Then
            assertThat(assignment.isOpen()).isTrue();
        }

        @Test
        @DisplayName("isOpen should be true when published with null due date")
        void isOpenShouldBeTrueWhenPublishedWithNullDueDate() {
            // Given
            Assignment assignment = Assignment.create(UUID.randomUUID(), lessonId, "Task 1", "d", "i", null, null);
            assignment.publish();

            // Then
            assertThat(assignment.isOpen()).isTrue();
        }

        @Test
        @DisplayName("isOpen should be false when DRAFT")
        void isOpenShouldBeFalseWhenDraft() {
            Assignment assignment = Assignment.create(UUID.randomUUID(), lessonId, "Task 1", "d", "i", null, null);
            assertThat(assignment.isOpen()).isFalse();
        }

        @Test
        @DisplayName("isEditable should be true only when DRAFT")
        void isEditableShouldBeTrueOnlyWhenDraft() {
            // Given
            Assignment draft = Assignment.create(UUID.randomUUID(), lessonId, "Task 1", "d", "i", null, null);
            Assignment published = Assignment.create(UUID.randomUUID(), lessonId, "Task 2", "d", "i", null, null);
            published.publish();

            // Then
            assertThat(draft.isEditable()).isTrue();
            assertThat(published.isEditable()).isFalse();
        }
    }

    @Nested
    @DisplayName("UpdateInfo Tests")
    class UpdateInfoTests {

        @Test
        @DisplayName("Should update non-null fields")
        void shouldUpdateNonNullFields() {
            // Given
            Assignment assignment = Assignment.create(UUID.randomUUID(), lessonId, "Old Title", "Old Desc", "Old Instr", null, null);

            // When
            assignment.updateInfo("New Title", "New Desc", "New Instr");

            // Then
            assertThat(assignment.getTitle()).isEqualTo("New Title");
            assertThat(assignment.getDescription()).isEqualTo("New Desc");
            assertThat(assignment.getInstructions()).isEqualTo("New Instr");
        }

        @Test
        @DisplayName("Should ignore null title in updateInfo")
        void shouldIgnoreNullTitleInUpdateInfo() {
            // Given
            Assignment assignment = Assignment.create(UUID.randomUUID(), lessonId, "Keep Me", "desc", "instr", null, null);

            // When
            assignment.updateInfo(null, "New Desc", null);

            // Then
            assertThat(assignment.getTitle()).isEqualTo("Keep Me");
            assertThat(assignment.getDescription()).isEqualTo("New Desc");
        }
    }
}
