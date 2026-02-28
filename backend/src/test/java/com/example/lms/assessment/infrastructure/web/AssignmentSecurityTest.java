package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentSubmissionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
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
import static org.mockito.Mockito.*;

/**
 * Security tests for AssignmentSubmissionControllerV3 IDOR fixes (P0-6, P0-7, P0-9).
 */
@ExtendWith(MockitoExtension.class)
class AssignmentSecurityTest {

    @Mock private AssignmentSubmissionJpaRepository submissionRepository;
    @Mock private AssignmentJpaRepository assignmentRepository;
    @Mock private JpaCourseRepository courseJpaRepository;

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
    @DisplayName("P0-6: getSubmissionById IDOR")
    class GetSubmissionById {

        @Test
        @DisplayName("Student chỉ xem được bài nộp của mình")
        void studentCanOnlySeeOwn() {
            UUID submissionId = UUID.randomUUID();
            var submission = mock(AssignmentSubmissionJpaEntity.class);
            when(submission.getStudentId()).thenReturn(studentAId);
            when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));

            var studentB = mockUser(studentBId, UserJpaEntity.UserRole.STUDENT);

            assertThatThrownBy(() -> controller.getSubmissionById(submissionId, studentB))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        }
    }

    @Nested
    @DisplayName("P0-7: gradeSubmission IDOR")
    class GradeSubmission {

        @Test
        @DisplayName("Teacher phải sở hữu khóa học để chấm điểm")
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

            var request = new AssignmentSubmissionControllerV3.GradeRequest(85.0, null, "Tốt");
            assertThatThrownBy(() -> controller.gradeSubmission(submissionId, request, otherTeacher))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        }

        @Test
        @DisplayName("Admin có thể chấm điểm bài nộp bất kỳ")
        void adminCanGradeAnySubmission() {
            UUID submissionId = UUID.randomUUID();
            var submission = mock(AssignmentSubmissionJpaEntity.class);
            // Stub getters needed by toSubmissionMap/toSubmissionDetailMap
            when(submission.getId()).thenReturn(submissionId);
            when(submission.getAssignmentId()).thenReturn(UUID.randomUUID());
            when(submission.getStudentId()).thenReturn(studentAId);
            when(submission.getStatus()).thenReturn(AssignmentSubmissionJpaEntity.SubmissionStatus.GRADED);
            when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));

            var admin = mockUser(adminId, UserJpaEntity.UserRole.ADMIN);

            var request = new AssignmentSubmissionControllerV3.GradeRequest(90.0, null, "Xuất sắc");
            var response = controller.gradeSubmission(submissionId, request, admin);
            assertThat(response.getStatusCode().value()).isEqualTo(200);
        }
    }

    @Nested
    @DisplayName("P0-9: publishAssignment IDOR")
    class PublishAssignment {

        @Test
        @DisplayName("Teacher phải sở hữu khóa học để phát hành bài tập")
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

    // Helper
    private UserJpaEntity mockUser(UUID userId, UserJpaEntity.UserRole role) {
        var user = mock(UserJpaEntity.class);
        when(user.getId()).thenReturn(userId);
        when(user.getRole()).thenReturn(role);
        return user;
    }
}
