package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepositoryPort;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepositoryPort;
import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.domain.valueobject.UserId;
import com.example.lms.shared.exception.BusinessRuleException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for EnrollStudentUseCaseV3.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("EnrollStudentUseCaseV3 Tests")
class EnrollStudentUseCaseV3Test {

    @Mock
    private UserRepository userRepository;
    
    @Mock
    private EnrollmentRepositoryPort enrollmentRepository;
    
    @Mock
    private LearningClassRepositoryPort learningClassRepository;

    @InjectMocks
    private EnrollStudentUseCaseV3 useCase;

    private User validStudent;
    private UUID studentId;
    private UUID classId;

    @BeforeEach
    void setUp() {
        studentId = UUID.randomUUID();
        classId = UUID.randomUUID();
        
        validStudent = User.builder()
            .id(UserId.of(studentId))
            .username("student1")
            .email(Email.of("student@example.com"))
            .password("encoded_password")
            .fullName("Test Student")
            .role(Role.STUDENT)
            .enabled(true)
            .build();
    }

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should enroll student successfully")
        void shouldEnrollStudentSuccessfully() {
            // Given
            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.of(validStudent));
            when(enrollmentRepository.existsByClassIdAndStudentId(classId, studentId)).thenReturn(false);

            // When
            UUID enrollmentId = useCase.enroll(studentId, classId);

            // Then
            assertThat(enrollmentId).isNotNull();
            verify(userRepository).findById(any(UserId.class));
            verify(enrollmentRepository).existsByClassIdAndStudentId(classId, studentId);
        }

        @Test
        @DisplayName("Should check for duplicate enrollment")
        void shouldCheckForDuplicateEnrollment() {
            // Given
            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.of(validStudent));
            when(enrollmentRepository.existsByClassIdAndStudentId(classId, studentId)).thenReturn(false);

            // When
            useCase.enroll(studentId, classId);

            // Then
            verify(enrollmentRepository).existsByClassIdAndStudentId(classId, studentId);
        }
    }

    @Nested
    @DisplayName("Error Handling Tests")
    class ErrorHandlingTests {

        @Test
        @DisplayName("Should throw when student not found")
        void shouldThrowWhenStudentNotFound() {
            // Given
            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> useCase.enroll(studentId, classId))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Student not found");

            verify(enrollmentRepository, never()).existsByClassIdAndStudentId(any(), any());
        }

        @Test
        @DisplayName("Should throw when student already enrolled")
        void shouldThrowWhenStudentAlreadyEnrolled() {
            // Given
            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.of(validStudent));
            when(enrollmentRepository.existsByClassIdAndStudentId(classId, studentId)).thenReturn(true);

            // When/Then
            assertThatThrownBy(() -> useCase.enroll(studentId, classId))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("already enrolled");
        }
    }
}
