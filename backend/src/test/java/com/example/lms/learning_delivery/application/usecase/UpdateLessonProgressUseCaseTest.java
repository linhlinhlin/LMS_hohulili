package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.application.dto.EnrollmentResponse;
import com.example.lms.learning_delivery.application.dto.UpdateLessonProgressCommand;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepository;
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
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UpdateLessonProgressUseCase.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UpdateLessonProgressUseCase Tests")
class UpdateLessonProgressUseCaseTest {

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private CertificateUseCase certificateUseCase;

    @InjectMocks
    private UpdateLessonProgressUseCase useCase;

    private UUID enrollmentId;
    private UUID lessonId;
    private UUID studentId;
    private UUID courseId;
    private LearningClass learningClass;

    @BeforeEach
    void setUp() {
        enrollmentId = UUID.randomUUID();
        lessonId = UUID.randomUUID();
        studentId = UUID.randomUUID();
        courseId = UUID.randomUUID();

        learningClass = LearningClass.builder()
            .id(UUID.randomUUID())
            .name("Maritime Navigation")
            .code("NAV-001")
            .courseId(courseId)
            .teacherId(UUID.randomUUID())
            .build();
    }

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should update lesson progress successfully")
        void shouldUpdateLessonProgressSuccessfully() {
            // Given
            Enrollment enrollment = Enrollment.builder()
                .id(enrollmentId)
                .learningClass(learningClass)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .progress(new HashMap<>())
                .completionPercent(0)
                .enrolledAt(Instant.now())
                .build();

            UpdateLessonProgressCommand command = new UpdateLessonProgressCommand(
                enrollmentId, lessonId, "COMPLETED", 300, 85.0
            );

            when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(enrollment));
            when(enrollmentRepository.save(any(Enrollment.class))).thenReturn(enrollment);

            // When
            EnrollmentResponse response = useCase.execute(command);

            // Then
            assertThat(response).isNotNull();
            assertThat(response.id()).isEqualTo(enrollmentId);
            assertThat(response.studentId()).isEqualTo(studentId);
            verify(enrollmentRepository).findById(enrollmentId);
            verify(enrollmentRepository).save(any(Enrollment.class));
        }

        @Test
        @DisplayName("Should recalculate completion percentage based on COMPLETED lessons")
        void shouldRecalculateCompletionPercentage() {
            // Given: 2 lessons already exist, 1 COMPLETED and 1 UNLOCKED
            Map<String, Enrollment.LessonProgress> existingProgress = new HashMap<>();
            existingProgress.put("lesson-1", Enrollment.LessonProgress.builder()
                .status("COMPLETED").build());
            existingProgress.put("lesson-2", Enrollment.LessonProgress.builder()
                .status("UNLOCKED").build());

            Enrollment enrollment = Enrollment.builder()
                .id(enrollmentId)
                .learningClass(learningClass)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .progress(existingProgress)
                .completionPercent(50)
                .enrolledAt(Instant.now())
                .build();

            // Command marks a new lesson (lesson-3) as COMPLETED
            UUID newLessonId = UUID.randomUUID();
            UpdateLessonProgressCommand command = new UpdateLessonProgressCommand(
                enrollmentId, newLessonId, "COMPLETED", 600, 90.0
            );

            when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(enrollment));
            when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            EnrollmentResponse response = useCase.execute(command);

            // Then: 2 out of 3 lessons are COMPLETED → 66%
            assertThat(response.completionPercent()).isEqualTo(66);
        }

        @Test
        @DisplayName("Should save enrollment after progress update")
        void shouldSaveEnrollmentAfterProgressUpdate() {
            // Given
            Enrollment enrollment = Enrollment.builder()
                .id(enrollmentId)
                .learningClass(learningClass)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .progress(new HashMap<>())
                .completionPercent(0)
                .enrolledAt(Instant.now())
                .build();

            UpdateLessonProgressCommand command = new UpdateLessonProgressCommand(
                enrollmentId, lessonId, "UNLOCKED", 120, null
            );

            when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(enrollment));
            when(enrollmentRepository.save(any(Enrollment.class))).thenReturn(enrollment);

            // When
            useCase.execute(command);

            // Then
            ArgumentCaptor<Enrollment> captor = ArgumentCaptor.forClass(Enrollment.class);
            verify(enrollmentRepository).save(captor.capture());
            Enrollment saved = captor.getValue();
            assertThat(saved.getProgress()).containsKey(lessonId.toString());
        }
    }

    @Nested
    @DisplayName("Certificate Trigger Tests")
    class CertificateTriggerTests {

        @Test
        @DisplayName("Should trigger certificate generation at 100% completion")
        void shouldTriggerCertificateAtFullCompletion() {
            // Given: single lesson, marking it COMPLETED will reach 100%
            Enrollment enrollment = Enrollment.builder()
                .id(enrollmentId)
                .learningClass(learningClass)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .progress(new HashMap<>())
                .completionPercent(0)
                .enrolledAt(Instant.now())
                .build();

            UpdateLessonProgressCommand command = new UpdateLessonProgressCommand(
                enrollmentId, lessonId, "COMPLETED", 600, 95.0
            );

            when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(enrollment));
            when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            useCase.execute(command);

            // Then: 1 out of 1 COMPLETED → 100% → certificate issued
            verify(certificateUseCase).issueIfNotExists(enrollmentId, studentId, courseId);
        }

        @Test
        @DisplayName("Should NOT trigger certificate below 100% completion")
        void shouldNotTriggerCertificateBelowFullCompletion() {
            // Given: 2 lessons, only 1 will be COMPLETED → 50%
            Map<String, Enrollment.LessonProgress> existingProgress = new HashMap<>();
            existingProgress.put("lesson-1", Enrollment.LessonProgress.builder()
                .status("UNLOCKED").build());

            Enrollment enrollment = Enrollment.builder()
                .id(enrollmentId)
                .learningClass(learningClass)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .progress(existingProgress)
                .completionPercent(0)
                .enrolledAt(Instant.now())
                .build();

            UpdateLessonProgressCommand command = new UpdateLessonProgressCommand(
                enrollmentId, lessonId, "COMPLETED", 300, 80.0
            );

            when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(enrollment));
            when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            useCase.execute(command);

            // Then: 1 out of 2 COMPLETED → 50% → no certificate
            verify(certificateUseCase, never()).issueIfNotExists(any(), any(), any());
        }
    }

    @Nested
    @DisplayName("Error Handling Tests")
    class ErrorHandlingTests {

        @Test
        @DisplayName("Should throw EntityNotFoundException when enrollment not found")
        void shouldThrowWhenEnrollmentNotFound() {
            // Given
            UUID missingId = UUID.randomUUID();
            UpdateLessonProgressCommand command = new UpdateLessonProgressCommand(
                missingId, lessonId, "COMPLETED", 300, 85.0
            );

            when(enrollmentRepository.findById(missingId)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> useCase.execute(command))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("Enrollment")
                .hasMessageContaining(missingId.toString());

            verify(enrollmentRepository, never()).save(any());
            verify(certificateUseCase, never()).issueIfNotExists(any(), any(), any());
        }
    }
}
