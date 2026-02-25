package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.application.dto.EnrollmentResponse;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepository;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.shared.domain.PageResponse;
import com.example.lms.shared.exception.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for GetClassStudentsUseCase.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("GetClassStudentsUseCase Tests")
class GetClassStudentsUseCaseTest {

    @Mock
    private LearningClassRepository classRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @InjectMocks
    private GetClassStudentsUseCase useCase;

    private UUID classId;
    private LearningClass learningClass;
    private Pageable pageable;

    @BeforeEach
    void setUp() {
        classId = UUID.randomUUID();
        pageable = PageRequest.of(0, 20);

        learningClass = LearningClass.builder()
            .id(classId)
            .name("Maritime Navigation")
            .code("NAV-001")
            .courseId(UUID.randomUUID())
            .teacherId(UUID.randomUUID())
            .maxStudents(30)
            .build();
    }

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should return students enrolled in class")
        void shouldReturnStudentsInClass() {
            // Given
            Enrollment enrollment1 = Enrollment.builder()
                .id(UUID.randomUUID())
                .learningClass(learningClass)
                .studentId(UUID.randomUUID())
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .progress(new HashMap<>())
                .completionPercent(45)
                .enrolledAt(Instant.now())
                .build();

            Enrollment enrollment2 = Enrollment.builder()
                .id(UUID.randomUUID())
                .learningClass(learningClass)
                .studentId(UUID.randomUUID())
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .progress(new HashMap<>())
                .completionPercent(80)
                .enrolledAt(Instant.now())
                .build();

            Page<Enrollment> enrollmentPage = new PageImpl<>(
                List.of(enrollment1, enrollment2), pageable, 2
            );

            when(classRepository.findById(classId)).thenReturn(Optional.of(learningClass));
            when(enrollmentRepository.findByClassId(classId, pageable)).thenReturn(enrollmentPage);

            // When
            PageResponse<EnrollmentResponse> result = useCase.execute(classId, pageable);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(2);
            assertThat(result.getTotalElements()).isEqualTo(2);
            assertThat(result.getContent().get(0).studentId()).isEqualTo(enrollment1.getStudentId());
            assertThat(result.getContent().get(1).studentId()).isEqualTo(enrollment2.getStudentId());

            verify(classRepository).findById(classId);
            verify(enrollmentRepository).findByClassId(classId, pageable);
        }

        @Test
        @DisplayName("Should return empty page when no students enrolled")
        void shouldReturnEmptyPageWhenNoStudents() {
            // Given
            Page<Enrollment> emptyPage = new PageImpl<>(
                Collections.emptyList(), pageable, 0
            );

            when(classRepository.findById(classId)).thenReturn(Optional.of(learningClass));
            when(enrollmentRepository.findByClassId(classId, pageable)).thenReturn(emptyPage);

            // When
            PageResponse<EnrollmentResponse> result = useCase.execute(classId, pageable);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getContent()).isEmpty();
            assertThat(result.getTotalElements()).isZero();
        }

        @Test
        @DisplayName("Should pass pageable correctly to repository")
        void shouldPassPageableCorrectly() {
            // Given
            Pageable customPageable = PageRequest.of(2, 10);
            Page<Enrollment> emptyPage = new PageImpl<>(
                Collections.emptyList(), customPageable, 0
            );

            when(classRepository.findById(classId)).thenReturn(Optional.of(learningClass));
            when(enrollmentRepository.findByClassId(eq(classId), eq(customPageable)))
                .thenReturn(emptyPage);

            // When
            useCase.execute(classId, customPageable);

            // Then
            verify(enrollmentRepository).findByClassId(classId, customPageable);
        }
    }

    @Nested
    @DisplayName("Error Handling Tests")
    class ErrorHandlingTests {

        @Test
        @DisplayName("Should throw EntityNotFoundException when class not found")
        void shouldThrowWhenClassNotFound() {
            // Given
            UUID missingClassId = UUID.randomUUID();
            when(classRepository.findById(missingClassId)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> useCase.execute(missingClassId, pageable))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("Lớp học")
                .hasMessageContaining(missingClassId.toString());

            verify(enrollmentRepository, never()).findByClassId(any(), any());
        }
    }
}
