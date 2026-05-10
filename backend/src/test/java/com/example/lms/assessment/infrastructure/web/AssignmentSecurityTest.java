package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.port.StudentAssessmentAccessPort;
import com.example.lms.assessment.application.usecase.GradeSubmissionUseCase;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentSubmissionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.GradingAuditLogJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.integration.WiiiLmsEventPublisher;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Security tests for assignment submission endpoints.
 */
@ExtendWith(MockitoExtension.class)
class AssignmentSecurityTest {

    @Mock private StudentAssessmentAccessPort studentAssessmentAccessPort;
    @Mock private AssignmentSubmissionJpaRepository submissionRepository;
    @Mock private AssignmentJpaRepository assignmentRepository;
    @Mock private JpaCourseRepository courseJpaRepository;
    @Mock private GradeSubmissionUseCase gradeSubmissionUseCase;
    @Mock private UserJpaRepository userJpaRepository;
    @Mock private GradingAuditLogJpaRepository gradingAuditLogRepository;
    @Mock private WiiiLmsEventPublisher wiiiLmsEventPublisher;

    @InjectMocks
    private AssignmentSubmissionControllerV3 controller;

    private UUID studentAId;
    private UUID studentBId;
    private UUID teacherId;
    private UUID otherTeacherId;
    private UUID adminId;

    @BeforeEach
    void setUp() {
        studentAId = UUID.randomUUID();
        studentBId = UUID.randomUUID();
        teacherId = UUID.randomUUID();
        otherTeacherId = UUID.randomUUID();
        adminId = UUID.randomUUID();
    }

    @Nested
    @DisplayName("getSubmissionById")
    class GetSubmissionById {

        @Test
        @DisplayName("student can only see own submission")
        void studentCanOnlySeeOwn() {
            UUID submissionId = UUID.randomUUID();
            var submission = mock(AssignmentSubmissionJpaEntity.class);
            when(submission.getStudentId()).thenReturn(studentAId);
            when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));

            var studentB = mockUser(studentBId, UserJpaEntity.UserRole.STUDENT);

            assertThatThrownBy(() -> controller.getSubmissionById(submissionId, studentB))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        }

        @Test
        @DisplayName("student cannot see submission if assignment boundary denies access")
        void studentCannotSeeSubmissionOutsideAssignmentBoundary() {
            UUID submissionId = UUID.randomUUID();
            UUID assignmentId = UUID.randomUUID();

            var submission = mock(AssignmentSubmissionJpaEntity.class);
            when(submission.getStudentId()).thenReturn(studentAId);
            when(submission.getAssignmentId()).thenReturn(assignmentId);
            when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));
            when(studentAssessmentAccessPort.canAccessAssignment(assignmentId, studentAId)).thenReturn(false);

            var studentA = mockUser(studentAId, UserJpaEntity.UserRole.STUDENT);

            assertThatThrownBy(() -> controller.getSubmissionById(submissionId, studentA))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        }
    }

    @Nested
    @DisplayName("gradeSubmission")
    class GradeSubmission {

        @Test
        @DisplayName("teacher must own course to grade")
        void teacherMustOwnCourse() {
            UUID submissionId = UUID.randomUUID();
            UUID assignmentId = UUID.randomUUID();
            UUID courseId = UUID.randomUUID();

            var submission = mock(AssignmentSubmissionJpaEntity.class);
            when(submission.getAssignmentId()).thenReturn(assignmentId);
            when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));

            var assignment = mock(AssignmentJpaEntity.class);
            when(assignment.getCourseId()).thenReturn(courseId);
            when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(assignment));

            var course = mock(CourseJpaEntity.class);
            when(course.getTeacherId()).thenReturn(teacherId);
            when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));

            var otherTeacher = mockUser(otherTeacherId, UserJpaEntity.UserRole.TEACHER);
            var request = new AssignmentSubmissionControllerV3.GradeRequest(85.0, null, "Tot", null);

            assertThatThrownBy(() -> controller.gradeSubmission(submissionId, request, otherTeacher))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        }

        @Test
        @DisplayName("admin can grade any submission")
        void adminCanGradeAnySubmission() {
            UUID submissionId = UUID.randomUUID();
            var submission = mock(AssignmentSubmissionJpaEntity.class);
            when(submission.getId()).thenReturn(submissionId);
            when(submission.getAssignmentId()).thenReturn(UUID.randomUUID());
            when(submission.getStudentId()).thenReturn(studentAId);
            when(submission.getStatus()).thenReturn(AssignmentSubmissionJpaEntity.SubmissionStatus.GRADED);
            when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));
            when(gradeSubmissionUseCase.gradeSubmission(submissionId, 90.0, "Xuat sac", null, adminId))
                    .thenReturn(submission);

            var admin = mockUser(adminId, UserJpaEntity.UserRole.ADMIN);
            var request = new AssignmentSubmissionControllerV3.GradeRequest(90.0, null, "Xuat sac", null);

            var response = controller.gradeSubmission(submissionId, request, admin);
            assertThat(response.getStatusCode().value()).isEqualTo(200);
        }
    }

    @Nested
    @DisplayName("publishAssignment")
    class PublishAssignment {

        @Test
        @DisplayName("teacher must own course to publish")
        void teacherMustOwnCourse() {
            UUID assignmentId = UUID.randomUUID();
            UUID courseId = UUID.randomUUID();

            var assignment = mock(AssignmentJpaEntity.class);
            when(assignment.getCourseId()).thenReturn(courseId);
            when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(assignment));

            var course = mock(CourseJpaEntity.class);
            when(course.getTeacherId()).thenReturn(teacherId);
            when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));

            var otherTeacher = mockUser(otherTeacherId, UserJpaEntity.UserRole.TEACHER);

            assertThatThrownBy(() -> controller.publishAssignment(assignmentId, otherTeacher))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        }
    }

    @Nested
    @DisplayName("student compatibility routes")
    class StudentSubmissionBoundary {

        @Test
        @DisplayName("student cannot submit inaccessible assignment through legacy endpoint")
        void studentCannotSubmitInaccessibleAssignment() {
            UUID assignmentId = UUID.randomUUID();

            var assignment = mock(AssignmentJpaEntity.class);
            when(assignment.getStatus()).thenReturn(AssignmentJpaEntity.AssignmentStatus.PUBLISHED);
            when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(assignment));
            when(studentAssessmentAccessPort.canAccessAssignment(assignmentId, studentAId)).thenReturn(false);

            var student = mockUser(studentAId, UserJpaEntity.UserRole.STUDENT);
            var request = new AssignmentSubmissionControllerV3.SubmitRequest("content", null, null);

            var response = controller.submitAssignment(assignmentId, request, student);

            assertThat(response.getStatusCode().value()).isEqualTo(403);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().isSuccess()).isFalse();
        }

        @Test
        @DisplayName("student cannot read inaccessible submission through legacy endpoint")
        void studentCannotReadMySubmissionForInaccessibleAssignment() {
            UUID assignmentId = UUID.randomUUID();
            when(studentAssessmentAccessPort.canAccessAssignment(assignmentId, studentAId)).thenReturn(false);

            var student = mockUser(studentAId, UserJpaEntity.UserRole.STUDENT);
            var response = controller.getMySubmission(assignmentId, student);

            assertThat(response.getStatusCode().value()).isEqualTo(403);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().isSuccess()).isFalse();
            verify(submissionRepository, never()).findByAssignmentIdAndStudentId(any(), any());
        }
    }

    private UserJpaEntity mockUser(UUID userId, UserJpaEntity.UserRole role) {
        var user = mock(UserJpaEntity.class);
        when(user.getId()).thenReturn(userId);
        org.mockito.Mockito.lenient().when(user.getRole()).thenReturn(role);
        return user;
    }
}
