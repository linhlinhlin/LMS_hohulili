package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.application.dto.DropStudentCommand;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.HashMap;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for DropStudentUseCase.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("DropStudentUseCase Tests")
class DropStudentUseCaseTest {

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @InjectMocks
    private DropStudentUseCase useCase;

    private UUID studentId;
    private UUID classId;
    private LearningClass learningClass;

    @BeforeEach
    void setUp() {
        studentId = UUID.randomUUID();
        classId = UUID.randomUUID();

        learningClass = LearningClass.builder()
            .id(classId)
            .name("Maritime Safety")
            .code("SAFE-001")
            .courseId(UUID.randomUUID())
            .teacherId(UUID.randomUUID())
            .build();
    }

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should drop student successfully")
        void shouldDropStudentSuccessfully() {
            // Given
            Enrollment enrollment = Enrollment.builder()
                .id(UUID.randomUUID())
                .learningClass(learningClass)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .progress(new HashMap<>())
                .completionPercent(30)
                .enrolledAt(Instant.now())
                .build();

            DropStudentCommand command = new DropStudentCommand(studentId, classId, null);

            when(enrollmentRepository.findByStudentIdAndClassId(studentId, classId))
                .thenReturn(Optional.of(enrollment));

            // When
            useCase.execute(command);

            // Then
            assertThat(enrollment.getStatus()).isEqualTo(Enrollment.EnrollmentStatus.DROPPED);
            verify(enrollmentRepository).findByStudentIdAndClassId(studentId, classId);
        }

        @Test
        @DisplayName("Should save enrollment after drop")
        void shouldSaveEnrollmentAfterDrop() {
            // Given
            Enrollment enrollment = Enrollment.builder()
                .id(UUID.randomUUID())
                .learningClass(learningClass)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .progress(new HashMap<>())
                .completionPercent(0)
                .enrolledAt(Instant.now())
                .build();

            DropStudentCommand command = new DropStudentCommand(studentId, classId, null);

            when(enrollmentRepository.findByStudentIdAndClassId(studentId, classId))
                .thenReturn(Optional.of(enrollment));

            // When
            useCase.execute(command);

            // Then
            ArgumentCaptor<Enrollment> captor = ArgumentCaptor.forClass(Enrollment.class);
            verify(enrollmentRepository).save(captor.capture());
            Enrollment saved = captor.getValue();
            assertThat(saved.getStatus()).isEqualTo(Enrollment.EnrollmentStatus.DROPPED);
        }
    }

    @Nested
    @DisplayName("Error Handling Tests")
    class ErrorHandlingTests {

        @Test
        @DisplayName("Should throw EntityNotFoundException when enrollment not found")
        void shouldThrowWhenEnrollmentNotFound() {
            // Given
            UUID unknownStudentId = UUID.randomUUID();
            UUID unknownClassId = UUID.randomUUID();
            DropStudentCommand command = new DropStudentCommand(unknownStudentId, unknownClassId, null);

            when(enrollmentRepository.findByStudentIdAndClassId(unknownStudentId, unknownClassId))
                .thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> useCase.execute(command))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("Enrollment");

            verify(enrollmentRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw BusinessRuleException when student already dropped")
        void shouldThrowWhenAlreadyDropped() {
            // Given
            Enrollment droppedEnrollment = Enrollment.builder()
                .id(UUID.randomUUID())
                .learningClass(learningClass)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.DROPPED)
                .progress(new HashMap<>())
                .completionPercent(0)
                .enrolledAt(Instant.now())
                .build();

            DropStudentCommand command = new DropStudentCommand(studentId, classId, null);

            when(enrollmentRepository.findByStudentIdAndClassId(studentId, classId))
                .thenReturn(Optional.of(droppedEnrollment));

            // When/Then
            assertThatThrownBy(() -> useCase.execute(command))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("đã bị xóa");

            verify(enrollmentRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw BusinessRuleException when enrollment is completed")
        void shouldThrowWhenEnrollmentCompleted() {
            // Given
            Enrollment completedEnrollment = Enrollment.builder()
                .id(UUID.randomUUID())
                .learningClass(learningClass)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.COMPLETED)
                .progress(new HashMap<>())
                .completionPercent(100)
                .enrolledAt(Instant.now())
                .completedAt(Instant.now())
                .build();

            DropStudentCommand command = new DropStudentCommand(studentId, classId, null);

            when(enrollmentRepository.findByStudentIdAndClassId(studentId, classId))
                .thenReturn(Optional.of(completedEnrollment));

            // When/Then
            assertThatThrownBy(() -> useCase.execute(command))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("hoàn thành");

            verify(enrollmentRepository, never()).save(any());
        }
    }
}
