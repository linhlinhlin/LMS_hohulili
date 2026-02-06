package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.dto.CreateAssignmentCommand;
import com.example.lms.assessment.domain.model.Assignment;
import com.example.lms.assessment.domain.repository.AssignmentRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for CreateAssignmentUseCaseV3.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("CreateAssignmentUseCaseV3 Tests")
class CreateAssignmentUseCaseV3Test {

    @Mock
    private AssignmentRepository assignmentRepository;

    @InjectMocks
    private CreateAssignmentUseCaseV3 useCase;

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should create assignment and return ID")
        void shouldCreateAssignmentAndReturnId() {
            // Given
            ArgumentCaptor<Assignment> captor = ArgumentCaptor.forClass(Assignment.class);
            when(assignmentRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

            CreateAssignmentCommand command = new CreateAssignmentCommand(
                UUID.randomUUID(), null, "Essay Assignment", "Write about navigation",
                "Follow the rubric", "ESSAY", 100, null, null, null, null
            );

            // When
            UUID result = useCase.execute(command);

            // Then
            assertThat(result).isNotNull();
            Assignment saved = captor.getValue();
            assertThat(saved.getTitle()).isEqualTo("Essay Assignment");
            assertThat(saved.getType()).isEqualTo(Assignment.AssignmentType.ESSAY);
            assertThat(saved.getStatus()).isEqualTo(Assignment.AssignmentStatus.DRAFT);
        }

        @Test
        @DisplayName("Should delegate allocation to repository port")
        void shouldDelegateAllocationToRepositoryPort() {
            // Given
            when(assignmentRepository.save(any(Assignment.class))).thenAnswer(inv -> inv.getArgument(0));

            List<UUID> studentIds = List.of(UUID.randomUUID(), UUID.randomUUID());
            CreateAssignmentCommand command = new CreateAssignmentCommand(
                UUID.randomUUID(), null, "Task", "desc", "instr",
                "FILE_UPLOAD", 50, null, null, "SPECIFIC_STUDENTS", studentIds
            );

            // When
            UUID result = useCase.execute(command);

            // Then
            assertThat(result).isNotNull();
            verify(assignmentRepository).allocate(any(UUID.class), eq("SPECIFIC_STUDENTS"), eq(studentIds));
        }

        @Test
        @DisplayName("Should set due date when provided")
        void shouldSetDueDateWhenProvided() {
            // Given
            when(assignmentRepository.save(any(Assignment.class))).thenAnswer(inv -> inv.getArgument(0));

            Instant futureDate = Instant.now().plusSeconds(86400 * 14);
            CreateAssignmentCommand command = new CreateAssignmentCommand(
                UUID.randomUUID(), null, "Task", "desc", "instr",
                "FILE_UPLOAD", 50, futureDate, null, null, null
            );

            // When
            UUID result = useCase.execute(command);

            // Then
            assertThat(result).isNotNull();
            verify(assignmentRepository).save(any(Assignment.class));
        }
    }

    @Nested
    @DisplayName("Validation Tests")
    class ValidationTests {

        @Test
        @DisplayName("Should throw when title is blank")
        void shouldThrowWhenTitleIsBlank() {
            // Given
            CreateAssignmentCommand command = new CreateAssignmentCommand(
                UUID.randomUUID(), null, "  ", "desc", "instr",
                "ESSAY", 100, null, null, null, null
            );

            // When/Then
            assertThatThrownBy(() -> useCase.execute(command))
                .isInstanceOf(IllegalArgumentException.class);
        }
    }
}
