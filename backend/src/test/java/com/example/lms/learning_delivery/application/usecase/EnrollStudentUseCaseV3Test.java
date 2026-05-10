package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepositoryPort;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepositoryPort;
import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.domain.event.DomainEventPublisher;
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

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private DomainEventPublisher eventPublisher;

    @InjectMocks
    private EnrollStudentUseCaseV3 useCase;

    private User validStudent;
    private UUID studentId;
    private UUID classId;
    private UUID courseId;
    private com.example.lms.learning_delivery.domain.model.LearningClass validClass;
    private Course approvedCourse;

    @BeforeEach
    void setUp() {
        studentId = UUID.randomUUID();
        classId = UUID.randomUUID();
        courseId = UUID.randomUUID();

        validStudent = User.builder()
            .id(UserId.of(studentId))
            .username("student1")
            .email(Email.of("student@example.com"))
            .password("encoded_password")
            .fullName("Test Student")
            .role(Role.STUDENT)
            .enabled(true)
            .build();

        validClass = com.example.lms.learning_delivery.domain.model.LearningClass.builder()
            .id(classId)
            .name("Test Class")
            .code("CLASS-001")
            .courseId(courseId)
            .teacherId(UUID.randomUUID())
            .maxStudents(30)
            .build();

        // Default: APPROVED course (lenient — not all tests reach course check)
        approvedCourse = mock(Course.class);
        lenient().when(approvedCourse.getStatus()).thenReturn(Course.CourseStatus.APPROVED);
    }

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should enroll student successfully")
        void shouldEnrollStudentSuccessfully() {
            // Given
            UUID expectedEnrollmentId = UUID.randomUUID();
            var savedEnrollment = com.example.lms.learning_delivery.domain.model.Enrollment.builder()
                .id(expectedEnrollmentId)
                .learningClass(validClass)
                .studentId(studentId)
                .status(com.example.lms.learning_delivery.domain.model.Enrollment.EnrollmentStatus.ACTIVE)
                .build();

            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.of(validStudent));
            when(learningClassRepository.findById(classId)).thenReturn(Optional.of(validClass));
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(approvedCourse));
            when(enrollmentRepository.existsByClassIdAndStudentId(classId, studentId)).thenReturn(false);
            when(enrollmentRepository.save(any(com.example.lms.learning_delivery.domain.model.Enrollment.class)))
                .thenReturn(savedEnrollment);

            // When
            UUID enrollmentId = useCase.enroll(studentId, classId);

            // Then
            assertThat(enrollmentId).isEqualTo(expectedEnrollmentId);
            verify(courseRepository).findById(courseId);
            verify(enrollmentRepository).existsByClassIdAndStudentId(classId, studentId);
        }

        @Test
        @DisplayName("Should allow enrollment in DRAFT course (teacher roster setup)")
        void shouldAllowEnrollmentInDraftCourse() {
            // Given — DRAFT course is allowed for teacher-initiated enrollment
            var draftCourse = mock(Course.class);
            when(draftCourse.getStatus()).thenReturn(Course.CourseStatus.DRAFT);

            var savedEnrollment = com.example.lms.learning_delivery.domain.model.Enrollment.builder()
                .id(UUID.randomUUID())
                .learningClass(validClass)
                .studentId(studentId)
                .status(com.example.lms.learning_delivery.domain.model.Enrollment.EnrollmentStatus.ACTIVE)
                .build();

            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.of(validStudent));
            when(learningClassRepository.findById(classId)).thenReturn(Optional.of(validClass));
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(draftCourse));
            when(enrollmentRepository.existsByClassIdAndStudentId(classId, studentId)).thenReturn(false);
            when(enrollmentRepository.save(any())).thenReturn(savedEnrollment);

            // When/Then — should NOT throw
            assertThatCode(() -> useCase.enroll(studentId, classId)).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should check for duplicate enrollment")
        void shouldCheckForDuplicateEnrollment() {
            // Given
            var savedEnrollment = com.example.lms.learning_delivery.domain.model.Enrollment.builder()
                .id(UUID.randomUUID())
                .learningClass(validClass)
                .studentId(studentId)
                .status(com.example.lms.learning_delivery.domain.model.Enrollment.EnrollmentStatus.ACTIVE)
                .build();

            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.of(validStudent));
            when(learningClassRepository.findById(classId)).thenReturn(Optional.of(validClass));
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(approvedCourse));
            when(enrollmentRepository.existsByClassIdAndStudentId(classId, studentId)).thenReturn(false);
            when(enrollmentRepository.save(any(com.example.lms.learning_delivery.domain.model.Enrollment.class)))
                .thenReturn(savedEnrollment);

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
            when(learningClassRepository.findById(classId)).thenReturn(Optional.of(validClass));
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(approvedCourse));
            when(enrollmentRepository.existsByClassIdAndStudentId(classId, studentId)).thenReturn(true);

            // When/Then
            assertThatThrownBy(() -> useCase.enroll(studentId, classId))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("already enrolled");
        }

        @Test
        @DisplayName("Should throw when course is PENDING")
        void shouldThrowWhenCoursePending() {
            // Given
            var pendingCourse = mock(Course.class);
            when(pendingCourse.getStatus()).thenReturn(Course.CourseStatus.PENDING);

            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.of(validStudent));
            when(learningClassRepository.findById(classId)).thenReturn(Optional.of(validClass));
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(pendingCourse));

            // When/Then
            assertThatThrownBy(() -> useCase.enroll(studentId, classId))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("chờ duyệt");
        }

        @Test
        @DisplayName("Should throw when course is REJECTED")
        void shouldThrowWhenCourseRejected() {
            // Given
            var rejectedCourse = mock(Course.class);
            when(rejectedCourse.getStatus()).thenReturn(Course.CourseStatus.REJECTED);

            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.of(validStudent));
            when(learningClassRepository.findById(classId)).thenReturn(Optional.of(validClass));
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(rejectedCourse));

            // When/Then
            assertThatThrownBy(() -> useCase.enroll(studentId, classId))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("bị từ chối");
        }
    }
}
