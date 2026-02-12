package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Assignment;
import com.example.lms.assessment.domain.model.AssignmentId;
import com.example.lms.assessment.domain.repository.AssignmentRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UpdateAssignmentUseCaseV3.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UpdateAssignmentUseCaseV3 Tests")
class UpdateAssignmentUseCaseV3Test {

    @Mock
    private AssignmentRepository assignmentRepository;

    @InjectMocks
    private UpdateAssignmentUseCaseV3 useCase;

    private UUID assignmentId;
    private Assignment existingAssignment;

    @BeforeEach
    void setUp() {
        assignmentId = UUID.randomUUID();
        existingAssignment = Assignment.create(UUID.randomUUID(), UUID.randomUUID(), "Old Title", "Old Desc", "Old Instr", null, null);
    }

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should update assignment info")
        void shouldUpdateAssignmentInfo() {
            // Given
            when(assignmentRepository.findById(any(AssignmentId.class))).thenReturn(Optional.of(existingAssignment));

            UpdateAssignmentUseCaseV3.Command command = new UpdateAssignmentUseCaseV3.Command(
                "New Title", "New Desc", "New Instr", null, null
            );

            // When
            useCase.execute(assignmentId, command);

            // Then
            verify(assignmentRepository).save(existingAssignment);
            assertThat(existingAssignment.getTitle()).isEqualTo("New Title");
        }

        @Test
        @DisplayName("Should update assignment with due date")
        void shouldUpdateAssignmentWithDueDate() {
            // Given
            when(assignmentRepository.findById(any(AssignmentId.class))).thenReturn(Optional.of(existingAssignment));

            Instant futureDate = Instant.now().plusSeconds(86400 * 7);
            UpdateAssignmentUseCaseV3.Command command = new UpdateAssignmentUseCaseV3.Command(
                null, null, null, futureDate.toString(), null
            );

            // When
            useCase.execute(assignmentId, command);

            // Then
            verify(assignmentRepository).save(existingAssignment);
            assertThat(existingAssignment.getDueDate()).isNotNull();
        }

        @Test
        @DisplayName("Should call save on repository")
        void shouldCallSaveOnRepository() {
            // Given
            when(assignmentRepository.findById(any(AssignmentId.class))).thenReturn(Optional.of(existingAssignment));

            UpdateAssignmentUseCaseV3.Command command = new UpdateAssignmentUseCaseV3.Command(
                "Title", null, null, null, null
            );

            // When
            useCase.execute(assignmentId, command);

            // Then
            verify(assignmentRepository, times(1)).save(any(Assignment.class));
        }
    }

    @Nested
    @DisplayName("Error Tests")
    class ErrorTests {

        @Test
        @DisplayName("Should throw when assignment not found")
        void shouldThrowWhenAssignmentNotFound() {
            // Given
            when(assignmentRepository.findById(any(AssignmentId.class))).thenReturn(Optional.empty());

            UpdateAssignmentUseCaseV3.Command command = new UpdateAssignmentUseCaseV3.Command(
                "Title", null, null, null, null
            );

            // When/Then
            assertThatThrownBy(() -> useCase.execute(assignmentId, command))
                .isInstanceOf(EntityNotFoundException.class);
        }

        @Test
        @DisplayName("Should throw when due date format is invalid")
        void shouldThrowWhenDueDateFormatIsInvalid() {
            // Given
            when(assignmentRepository.findById(any(AssignmentId.class))).thenReturn(Optional.of(existingAssignment));

            UpdateAssignmentUseCaseV3.Command command = new UpdateAssignmentUseCaseV3.Command(
                null, null, null, "not-a-date", null
            );

            // When/Then
            assertThatThrownBy(() -> useCase.execute(assignmentId, command))
                .isInstanceOf(Exception.class); // Instant.parse throws DateTimeParseException
        }
    }
}
