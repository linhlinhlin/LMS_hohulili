package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.dto.StudentAssignmentResponse;
import com.example.lms.assessment.application.port.StudentAssignmentQueryPort;
import com.example.lms.assessment.application.port.StudentAssignmentQueryPort.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
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
    private StudentAssignmentQueryPort queryPort;

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
            when(queryPort.findActiveEnrolledCourses(studentId)).thenReturn(List.of());

            List<StudentAssignmentResponse> result = useCase.execute(studentId);

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should return empty list when no assignments for enrolled courses")
        void shouldReturnEmptyWhenNoAssignments() {
            when(queryPort.findActiveEnrolledCourses(studentId))
                    .thenReturn(List.of(new EnrolledCourse(courseId)));
            when(queryPort.findPublishedAssignmentsByCourseIds(anyList()))
                    .thenReturn(List.of());

            List<StudentAssignmentResponse> result = useCase.execute(studentId);

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should return assignments with NOT_SUBMITTED status when no submission exists")
        void shouldReturnNotSubmittedStatus() {
            UUID assignmentId = UUID.randomUUID();
            when(queryPort.findActiveEnrolledCourses(studentId))
                    .thenReturn(List.of(new EnrolledCourse(courseId)));
            when(queryPort.findPublishedAssignmentsByCourseIds(anyList()))
                    .thenReturn(List.of(new AssignmentSummary(
                            assignmentId, "Essay 1", "desc", "inst",
                            courseId, Instant.now().plus(7, ChronoUnit.DAYS),
                            100.0, false, 1)));
            when(queryPort.findLatestSubmissionsByStudent(studentId)).thenReturn(Map.of());
            when(queryPort.findCourseTitle(courseId)).thenReturn(Optional.of("Hàng hải"));

            List<StudentAssignmentResponse> result = useCase.execute(studentId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).status()).isEqualTo("NOT_SUBMITTED");
            assertThat(result.get(0).isLate()).isFalse();
            assertThat(result.get(0).courseName()).isEqualTo("Hàng hải");
        }

        @Test
        @DisplayName("Should return OVERDUE status for past-due unsubmitted assignment")
        void shouldReturnOverdueStatus() {
            UUID assignmentId = UUID.randomUUID();
            when(queryPort.findActiveEnrolledCourses(studentId))
                    .thenReturn(List.of(new EnrolledCourse(courseId)));
            when(queryPort.findPublishedAssignmentsByCourseIds(anyList()))
                    .thenReturn(List.of(new AssignmentSummary(
                            assignmentId, "Overdue Essay", "desc", "inst",
                            courseId, Instant.now().minus(2, ChronoUnit.DAYS),
                            100.0, false, 1)));
            when(queryPort.findLatestSubmissionsByStudent(studentId)).thenReturn(Map.of());
            when(queryPort.findCourseTitle(courseId)).thenReturn(Optional.of("Course"));

            List<StudentAssignmentResponse> result = useCase.execute(studentId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).status()).isEqualTo("OVERDUE");
        }

        @Test
        @DisplayName("Should return GRADED status with score for graded submission")
        void shouldReturnGradedStatus() {
            UUID assignmentId = UUID.randomUUID();
            when(queryPort.findActiveEnrolledCourses(studentId))
                    .thenReturn(List.of(new EnrolledCourse(courseId)));
            when(queryPort.findPublishedAssignmentsByCourseIds(anyList()))
                    .thenReturn(List.of(new AssignmentSummary(
                            assignmentId, "Graded Essay", "desc", "inst",
                            courseId, Instant.now().plus(7, ChronoUnit.DAYS),
                            100.0, false, 1)));
            when(queryPort.findLatestSubmissionsByStudent(studentId))
                    .thenReturn(Map.of(assignmentId, new SubmissionInfo(
                            UUID.randomUUID(), assignmentId,
                            Instant.now().minus(1, ChronoUnit.HOURS),
                            85.0, "Good work", Instant.now(), null, null, null,
                            "GRADED")));
            when(queryPort.findCourseTitle(courseId)).thenReturn(Optional.of("Course"));

            List<StudentAssignmentResponse> result = useCase.execute(studentId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).status()).isEqualTo("GRADED");
            assertThat(result.get(0).score()).isEqualTo(85.0);
        }

        @Test
        @DisplayName("Should compute isLate when submission is after due date")
        void shouldComputeIsLate() {
            UUID assignmentId = UUID.randomUUID();
            Instant dueDate = Instant.now().minus(1, ChronoUnit.DAYS);

            when(queryPort.findActiveEnrolledCourses(studentId))
                    .thenReturn(List.of(new EnrolledCourse(courseId)));
            when(queryPort.findPublishedAssignmentsByCourseIds(anyList()))
                    .thenReturn(List.of(new AssignmentSummary(
                            assignmentId, "Late Essay", "desc", "inst",
                            courseId, dueDate, 100.0, false, 1)));
            when(queryPort.findLatestSubmissionsByStudent(studentId))
                    .thenReturn(Map.of(assignmentId, new SubmissionInfo(
                            UUID.randomUUID(), assignmentId,
                            Instant.now(), // Submitted after due date
                            null, null, null, null, null, null,
                            "SUBMITTED")));
            when(queryPort.findCourseTitle(courseId)).thenReturn(Optional.of("Course"));

            List<StudentAssignmentResponse> result = useCase.execute(studentId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).isLate()).isTrue();
            assertThat(result.get(0).status()).isEqualTo("LATE");
        }

        @Test
        @DisplayName("Should sort results by due date (ascending)")
        void shouldSortByDueDate() {
            UUID a1Id = UUID.randomUUID();
            UUID a2Id = UUID.randomUUID();

            when(queryPort.findActiveEnrolledCourses(studentId))
                    .thenReturn(List.of(new EnrolledCourse(courseId)));
            when(queryPort.findPublishedAssignmentsByCourseIds(anyList()))
                    .thenReturn(List.of(
                            new AssignmentSummary(a2Id, "Later", "desc", "inst",
                                    courseId, Instant.now().plus(10, ChronoUnit.DAYS),
                                    100.0, false, 1),
                            new AssignmentSummary(a1Id, "Earlier", "desc", "inst",
                                    courseId, Instant.now().plus(2, ChronoUnit.DAYS),
                                    100.0, false, 1)));
            when(queryPort.findLatestSubmissionsByStudent(studentId)).thenReturn(Map.of());
            when(queryPort.findCourseTitle(courseId)).thenReturn(Optional.of("Course"));

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
            when(queryPort.findAssignmentById(assignmentId)).thenReturn(Optional.empty());

            Optional<StudentAssignmentResponse> result = useCase.getById(assignmentId, studentId);

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should return assignment detail with submission data")
        void shouldReturnDetailWithSubmission() {
            UUID assignmentId = UUID.randomUUID();

            when(queryPort.findAssignmentById(assignmentId))
                    .thenReturn(Optional.of(new AssignmentDetail(
                            assignmentId, "Detail Essay", "desc", "inst",
                            courseId, Instant.now().plus(7, ChronoUnit.DAYS),
                            100.0, false, 1)));
            when(queryPort.findSubmission(assignmentId, studentId))
                    .thenReturn(Optional.of(new SubmissionInfo(
                            UUID.randomUUID(), assignmentId,
                            Instant.now().minus(1, ChronoUnit.HOURS),
                            null, null, null, null, null, null,
                            "SUBMITTED")));
            when(queryPort.findCourseTitle(courseId)).thenReturn(Optional.of("Hàng hải"));

            Optional<StudentAssignmentResponse> result = useCase.getById(assignmentId, studentId);

            assertThat(result).isPresent();
            assertThat(result.get().title()).isEqualTo("Detail Essay");
            assertThat(result.get().status()).isEqualTo("SUBMITTED");
            assertThat(result.get().courseName()).isEqualTo("Hàng hải");
        }
    }
}
