package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.dto.StudentAssignmentResponse;
import com.example.lms.assessment.application.port.StudentAssessmentAccessPort;
import com.example.lms.assessment.application.port.StudentAssignmentQueryPort;
import com.example.lms.assessment.application.port.StudentAssignmentQueryPort.AssignmentDetail;
import com.example.lms.assessment.application.port.StudentAssignmentQueryPort.AssignmentSummary;
import com.example.lms.assessment.application.port.StudentAssignmentQueryPort.EnrolledCourse;
import com.example.lms.assessment.application.port.StudentAssignmentQueryPort.SubmissionInfo;
import org.junit.jupiter.api.BeforeEach;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("GetStudentAssignmentsUseCase Tests")
class GetStudentAssignmentsUseCaseTest {

    @Mock
    private StudentAssignmentQueryPort queryPort;

    @Mock
    private StudentAssessmentAccessPort accessPort;

    @InjectMocks
    private GetStudentAssignmentsUseCase useCase;

    private final UUID studentId = UUID.randomUUID();
    private final UUID courseId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        lenient().when(accessPort.filterAccessibleAssignmentIds(anyList(), eq(studentId)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(accessPort.canAccessAssignment(any(UUID.class), eq(studentId))).thenReturn(true);
    }

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
                            assignmentId,
                            "Essay 1",
                            "desc",
                            "inst",
                            courseId,
                            Instant.now().plus(7, ChronoUnit.DAYS),
                            100.0,
                            false,
                            1)));
            when(queryPort.findLatestSubmissionsByStudent(studentId)).thenReturn(Map.of());
            when(queryPort.findCourseTitle(courseId)).thenReturn(Optional.of("Hang hai"));

            List<StudentAssignmentResponse> result = useCase.execute(studentId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).status()).isEqualTo("NOT_SUBMITTED");
            assertThat(result.get(0).isLate()).isFalse();
            assertThat(result.get(0).courseName()).isEqualTo("Hang hai");
        }

        @Test
        @DisplayName("Should return OVERDUE status for past-due unsubmitted assignment")
        void shouldReturnOverdueStatus() {
            UUID assignmentId = UUID.randomUUID();
            when(queryPort.findActiveEnrolledCourses(studentId))
                    .thenReturn(List.of(new EnrolledCourse(courseId)));
            when(queryPort.findPublishedAssignmentsByCourseIds(anyList()))
                    .thenReturn(List.of(new AssignmentSummary(
                            assignmentId,
                            "Overdue Essay",
                            "desc",
                            "inst",
                            courseId,
                            Instant.now().minus(2, ChronoUnit.DAYS),
                            100.0,
                            false,
                            1)));
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
                            assignmentId,
                            "Graded Essay",
                            "desc",
                            "inst",
                            courseId,
                            Instant.now().plus(7, ChronoUnit.DAYS),
                            100.0,
                            false,
                            1)));
            when(queryPort.findLatestSubmissionsByStudent(studentId))
                    .thenReturn(Map.of(assignmentId, new SubmissionInfo(
                            UUID.randomUUID(),
                            assignmentId,
                            Instant.now().minus(1, ChronoUnit.HOURS),
                            85.0,
                            "Good work",
                            Instant.now(),
                            null,
                            null,
                            null,
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
                            assignmentId,
                            "Late Essay",
                            "desc",
                            "inst",
                            courseId,
                            dueDate,
                            100.0,
                            false,
                            1)));
            when(queryPort.findLatestSubmissionsByStudent(studentId))
                    .thenReturn(Map.of(assignmentId, new SubmissionInfo(
                            UUID.randomUUID(),
                            assignmentId,
                            Instant.now(),
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            "SUBMITTED")));
            when(queryPort.findCourseTitle(courseId)).thenReturn(Optional.of("Course"));

            List<StudentAssignmentResponse> result = useCase.execute(studentId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).isLate()).isTrue();
            assertThat(result.get(0).status()).isEqualTo("LATE");
        }

        @Test
        @DisplayName("Should sort results by due date ascending")
        void shouldSortByDueDate() {
            UUID earlierId = UUID.randomUUID();
            UUID laterId = UUID.randomUUID();

            when(queryPort.findActiveEnrolledCourses(studentId))
                    .thenReturn(List.of(new EnrolledCourse(courseId)));
            when(queryPort.findPublishedAssignmentsByCourseIds(anyList()))
                    .thenReturn(List.of(
                            new AssignmentSummary(
                                    laterId,
                                    "Later",
                                    "desc",
                                    "inst",
                                    courseId,
                                    Instant.now().plus(10, ChronoUnit.DAYS),
                                    100.0,
                                    false,
                                    1),
                            new AssignmentSummary(
                                    earlierId,
                                    "Earlier",
                                    "desc",
                                    "inst",
                                    courseId,
                                    Instant.now().plus(2, ChronoUnit.DAYS),
                                    100.0,
                                    false,
                                    1)));
            when(queryPort.findLatestSubmissionsByStudent(studentId)).thenReturn(Map.of());
            when(queryPort.findCourseTitle(courseId)).thenReturn(Optional.of("Course"));

            List<StudentAssignmentResponse> result = useCase.execute(studentId);

            assertThat(result).hasSize(2);
            assertThat(result.get(0).title()).isEqualTo("Earlier");
            assertThat(result.get(1).title()).isEqualTo("Later");
        }

        @Test
        @DisplayName("Should filter out assignments student cannot access")
        void shouldFilterOutInaccessibleAssignments() {
            UUID visibleAssignmentId = UUID.randomUUID();
            UUID hiddenAssignmentId = UUID.randomUUID();

            when(queryPort.findActiveEnrolledCourses(studentId))
                    .thenReturn(List.of(new EnrolledCourse(courseId)));
            when(queryPort.findPublishedAssignmentsByCourseIds(anyList()))
                    .thenReturn(List.of(
                            new AssignmentSummary(
                                    visibleAssignmentId,
                                    "Visible",
                                    "desc",
                                    "inst",
                                    courseId,
                                    Instant.now().plus(3, ChronoUnit.DAYS),
                                    100.0,
                                    false,
                                    1),
                            new AssignmentSummary(
                                    hiddenAssignmentId,
                                    "Hidden",
                                    "desc",
                                    "inst",
                                    courseId,
                                    Instant.now().plus(4, ChronoUnit.DAYS),
                                    100.0,
                                    false,
                                    1)));
            when(accessPort.filterAccessibleAssignmentIds(anyList(), eq(studentId)))
                    .thenReturn(List.of(visibleAssignmentId));
            when(queryPort.findLatestSubmissionsByStudent(studentId)).thenReturn(Map.of());
            when(queryPort.findCourseTitle(courseId)).thenReturn(Optional.of("Course"));

            List<StudentAssignmentResponse> result = useCase.execute(studentId);

            assertThat(result).extracting(StudentAssignmentResponse::title).containsExactly("Visible");
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
                            assignmentId,
                            "Detail Essay",
                            "desc",
                            "inst",
                            courseId,
                            Instant.now().plus(7, ChronoUnit.DAYS),
                            100.0,
                            false,
                            1)));
            when(queryPort.findSubmission(assignmentId, studentId))
                    .thenReturn(Optional.of(new SubmissionInfo(
                            UUID.randomUUID(),
                            assignmentId,
                            Instant.now().minus(1, ChronoUnit.HOURS),
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            "SUBMITTED")));
            when(queryPort.findCourseTitle(courseId)).thenReturn(Optional.of("Hang hai"));

            Optional<StudentAssignmentResponse> result = useCase.getById(assignmentId, studentId);

            assertThat(result).isPresent();
            assertThat(result.get().title()).isEqualTo("Detail Essay");
            assertThat(result.get().status()).isEqualTo("SUBMITTED");
            assertThat(result.get().courseName()).isEqualTo("Hang hai");
        }

        @Test
        @DisplayName("Should return empty when assignment is not accessible")
        void shouldReturnEmptyWhenAccessDenied() {
            UUID assignmentId = UUID.randomUUID();
            when(accessPort.canAccessAssignment(assignmentId, studentId)).thenReturn(false);

            Optional<StudentAssignmentResponse> result = useCase.getById(assignmentId, studentId);

            assertThat(result).isEmpty();
            verify(queryPort, never()).findAssignmentById(any());
        }
    }
}
