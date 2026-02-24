package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.dto.StudentAssignmentResponse;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentSubmissionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests for GetStudentAssignmentsUseCase (CQRS read-side).
 *
 * Verifies:
 * - Correct enrollment-based filtering
 * - Status mapping (NOT_SUBMITTED, SUBMITTED, GRADED, LATE, OVERDUE)
 * - isLate computation
 * - Empty list for students with no enrollments
 * - Sorted by due date
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("GetStudentAssignmentsUseCase Tests")
class GetStudentAssignmentsUseCaseTest {

    @Mock
    private JpaEnrollmentRepository enrollmentRepository;

    @Mock
    private AssignmentJpaRepository assignmentRepository;

    @Mock
    private AssignmentSubmissionJpaRepository submissionRepository;

    @Mock
    private JpaCourseRepository courseRepository;

    @InjectMocks
    private GetStudentAssignmentsUseCase useCase;

    private final UUID studentId = UUID.randomUUID();
    private final UUID courseId = UUID.randomUUID();

    @Nested
    @DisplayName("List student assignments")
    class ListAssignments {

        @Test
        @DisplayName("Should return empty list when student has no enrollments")
        void shouldReturnEmptyWhenNoEnrollments() {
            when(enrollmentRepository.findActiveWithClass(studentId)).thenReturn(List.of());

            List<StudentAssignmentResponse> result = useCase.execute(studentId);

            assertThat(result).isEmpty();
            verifyNoInteractions(assignmentRepository, submissionRepository, courseRepository);
        }

        @Test
        @DisplayName("Should return empty list when no assignments for enrolled courses")
        void shouldReturnEmptyWhenNoAssignments() {
            var enrollment = mockEnrollment(courseId);
            when(enrollmentRepository.findActiveWithClass(studentId)).thenReturn(List.of(enrollment));
            when(assignmentRepository.findByCourseIdInAndStatus(anyList(), any()))
                    .thenReturn(List.of());

            List<StudentAssignmentResponse> result = useCase.execute(studentId);

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should return assignments with NOT_SUBMITTED status when no submission exists")
        void shouldReturnNotSubmittedStatus() {
            var enrollment = mockEnrollment(courseId);
            var assignment = mockAssignment(courseId, "Essay 1",
                    Instant.now().plus(7, ChronoUnit.DAYS));

            when(enrollmentRepository.findActiveWithClass(studentId)).thenReturn(List.of(enrollment));
            when(assignmentRepository.findByCourseIdInAndStatus(anyList(), any()))
                    .thenReturn(List.of(assignment));
            when(submissionRepository.findByStudentId(studentId)).thenReturn(List.of());
            var course = mockCourse(courseId, "Hàng hải");
            when(courseRepository.findAllById(anyList())).thenReturn(List.of(course));

            List<StudentAssignmentResponse> result = useCase.execute(studentId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).status()).isEqualTo("NOT_SUBMITTED");
            assertThat(result.get(0).isLate()).isFalse();
            assertThat(result.get(0).courseName()).isEqualTo("Hàng hải");
        }

        @Test
        @DisplayName("Should return OVERDUE status for past-due unsubmitted assignment")
        void shouldReturnOverdueStatus() {
            var enrollment = mockEnrollment(courseId);
            var assignment = mockAssignment(courseId, "Overdue Essay",
                    Instant.now().minus(2, ChronoUnit.DAYS)); // Due 2 days ago

            when(enrollmentRepository.findActiveWithClass(studentId)).thenReturn(List.of(enrollment));
            when(assignmentRepository.findByCourseIdInAndStatus(anyList(), any()))
                    .thenReturn(List.of(assignment));
            when(submissionRepository.findByStudentId(studentId)).thenReturn(List.of());
            var course = mockCourse(courseId, "Course");
            when(courseRepository.findAllById(anyList())).thenReturn(List.of(course));

            List<StudentAssignmentResponse> result = useCase.execute(studentId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).status()).isEqualTo("OVERDUE");
        }

        @Test
        @DisplayName("Should return GRADED status with score for graded submission")
        void shouldReturnGradedStatus() {
            var enrollment = mockEnrollment(courseId);
            UUID assignmentId = UUID.randomUUID();
            var assignment = mockAssignment(courseId, assignmentId, "Graded Essay",
                    Instant.now().plus(7, ChronoUnit.DAYS));
            var submission = mockSubmission(assignmentId,
                    AssignmentSubmissionJpaEntity.SubmissionStatus.GRADED, 85.0);

            when(enrollmentRepository.findActiveWithClass(studentId)).thenReturn(List.of(enrollment));
            when(assignmentRepository.findByCourseIdInAndStatus(anyList(), any()))
                    .thenReturn(List.of(assignment));
            when(submissionRepository.findByStudentId(studentId)).thenReturn(List.of(submission));
            var course = mockCourse(courseId, "Course");
            when(courseRepository.findAllById(anyList())).thenReturn(List.of(course));

            List<StudentAssignmentResponse> result = useCase.execute(studentId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).status()).isEqualTo("GRADED");
            assertThat(result.get(0).score()).isEqualTo(85.0);
        }

        @Test
        @DisplayName("Should compute isLate when submission is after due date")
        void shouldComputeIsLate() {
            var enrollment = mockEnrollment(courseId);
            UUID assignmentId = UUID.randomUUID();
            Instant dueDate = Instant.now().minus(1, ChronoUnit.DAYS);
            var assignment = mockAssignment(courseId, assignmentId, "Late Essay", dueDate);

            var submission = mock(AssignmentSubmissionJpaEntity.class);
            when(submission.getAssignmentId()).thenReturn(assignmentId);
            when(submission.getStatus()).thenReturn(AssignmentSubmissionJpaEntity.SubmissionStatus.SUBMITTED);
            when(submission.getSubmittedAt()).thenReturn(Instant.now()); // Submitted after due date
            when(submission.getId()).thenReturn(UUID.randomUUID());

            when(enrollmentRepository.findActiveWithClass(studentId)).thenReturn(List.of(enrollment));
            when(assignmentRepository.findByCourseIdInAndStatus(anyList(), any()))
                    .thenReturn(List.of(assignment));
            when(submissionRepository.findByStudentId(studentId)).thenReturn(List.of(submission));
            var course = mockCourse(courseId, "Course");
            when(courseRepository.findAllById(anyList())).thenReturn(List.of(course));

            List<StudentAssignmentResponse> result = useCase.execute(studentId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).isLate()).isTrue();
            assertThat(result.get(0).status()).isEqualTo("LATE");
        }

        @Test
        @DisplayName("Should sort results by due date (ascending)")
        void shouldSortByDueDate() {
            var enrollment = mockEnrollment(courseId);

            var earlierAssignment = mockAssignment(courseId, "Earlier",
                    Instant.now().plus(2, ChronoUnit.DAYS));
            var laterAssignment = mockAssignment(courseId, "Later",
                    Instant.now().plus(10, ChronoUnit.DAYS));

            when(enrollmentRepository.findActiveWithClass(studentId)).thenReturn(List.of(enrollment));
            when(assignmentRepository.findByCourseIdInAndStatus(anyList(), any()))
                    .thenReturn(List.of(laterAssignment, earlierAssignment)); // Reversed order
            when(submissionRepository.findByStudentId(studentId)).thenReturn(List.of());
            var course = mockCourse(courseId, "Course");
            when(courseRepository.findAllById(anyList())).thenReturn(List.of(course));

            List<StudentAssignmentResponse> result = useCase.execute(studentId);

            assertThat(result).hasSize(2);
            assertThat(result.get(0).title()).isEqualTo("Earlier");
            assertThat(result.get(1).title()).isEqualTo("Later");
        }
    }

    @Nested
    @DisplayName("Get assignment by ID")
    class GetById {

        @Test
        @DisplayName("Should return empty when assignment not found")
        void shouldReturnEmptyWhenNotFound() {
            UUID assignmentId = UUID.randomUUID();
            when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.empty());

            Optional<StudentAssignmentResponse> result = useCase.getById(assignmentId, studentId);

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should return assignment detail with submission data")
        void shouldReturnDetailWithSubmission() {
            UUID assignmentId = UUID.randomUUID();
            var assignment = mockAssignment(courseId, assignmentId, "Detail Essay",
                    Instant.now().plus(7, ChronoUnit.DAYS));

            var submission = mock(AssignmentSubmissionJpaEntity.class);
            when(submission.getStatus()).thenReturn(AssignmentSubmissionJpaEntity.SubmissionStatus.SUBMITTED);
            when(submission.getSubmittedAt()).thenReturn(Instant.now().minus(1, ChronoUnit.HOURS));
            when(submission.getId()).thenReturn(UUID.randomUUID());

            when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(assignment));
            when(submissionRepository.findByAssignmentIdAndStudentId(assignmentId, studentId))
                    .thenReturn(Optional.of(submission));
            var course = mockCourse(courseId, "Hàng hải");
            when(courseRepository.findById(courseId))
                    .thenReturn(Optional.of(course));

            Optional<StudentAssignmentResponse> result = useCase.getById(assignmentId, studentId);

            assertThat(result).isPresent();
            assertThat(result.get().title()).isEqualTo("Detail Essay");
            assertThat(result.get().status()).isEqualTo("SUBMITTED");
            assertThat(result.get().courseName()).isEqualTo("Hàng hải");
        }
    }

    // =============================================
    // Helper methods
    // =============================================

    private EnrollmentJpaEntity mockEnrollment(UUID courseId) {
        var learningClass = mock(LearningClassJpaEntity.class);
        when(learningClass.getCourseId()).thenReturn(courseId);

        var enrollment = mock(EnrollmentJpaEntity.class);
        when(enrollment.getLearningClass()).thenReturn(learningClass);

        return enrollment;
    }

    private AssignmentJpaEntity mockAssignment(UUID courseId, String title, Instant dueDate) {
        return mockAssignment(courseId, UUID.randomUUID(), title, dueDate);
    }

    private AssignmentJpaEntity mockAssignment(UUID courseId, UUID assignmentId, String title, Instant dueDate) {
        var assignment = mock(AssignmentJpaEntity.class);
        when(assignment.getId()).thenReturn(assignmentId);
        when(assignment.getTitle()).thenReturn(title);
        when(assignment.getCourseId()).thenReturn(courseId);
        when(assignment.getDueDate()).thenReturn(dueDate);
        when(assignment.getStatus()).thenReturn(AssignmentJpaEntity.AssignmentStatus.PUBLISHED);
        when(assignment.getMaxScore()).thenReturn(new BigDecimal("100"));
        when(assignment.getAllowLateSubmission()).thenReturn(false);
        return assignment;
    }

    private AssignmentSubmissionJpaEntity mockSubmission(UUID assignmentId,
            AssignmentSubmissionJpaEntity.SubmissionStatus status, Double grade) {
        var submission = mock(AssignmentSubmissionJpaEntity.class);
        when(submission.getAssignmentId()).thenReturn(assignmentId);
        when(submission.getStatus()).thenReturn(status);
        when(submission.getGrade()).thenReturn(grade);
        when(submission.getSubmittedAt()).thenReturn(Instant.now().minus(1, ChronoUnit.HOURS));
        when(submission.getId()).thenReturn(UUID.randomUUID());
        return submission;
    }

    private CourseJpaEntity mockCourse(UUID courseId, String title) {
        var course = mock(CourseJpaEntity.class);
        when(course.getId()).thenReturn(courseId);
        when(course.getTitle()).thenReturn(title);
        return course;
    }
}
