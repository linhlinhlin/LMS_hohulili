package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizAttemptJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizJpaRepositoryV3;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.application.usecase.CertificateUseCase;
import com.example.lms.learning_delivery.application.usecase.SelfEnrollUseCase;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.EnrollmentRepositoryImpl;
import com.example.lms.learning_delivery.infrastructure.persistence.CertificateJpaRepository;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StudentEnrollmentControllerV3Test {

    @Mock private EnrollmentRepositoryImpl enrollmentRepository;
    @Mock private LearningClassRepository learningClassRepository;
    @Mock private JpaCourseRepository courseJpaRepository;
    @Mock private UserJpaRepository userJpaRepository;
    @Mock private com.example.lms.course_authoring.infrastructure.persistence.repository.CourseCategoryJpaRepository categoryJpaRepository;
    @Mock private ChapterJpaRepository chapterJpaRepository;
    @Mock private LessonJpaRepository lessonJpaRepository;
    @Mock private CertificateJpaRepository certificateRepository;
    @Mock private CertificateUseCase certificateUseCase;
    @Mock private SelfEnrollUseCase selfEnrollUseCase;
    @Mock private AssignmentJpaRepository assignmentJpaRepository;
    @Mock private AssignmentSubmissionJpaRepository submissionJpaRepository;
    @Mock private QuizJpaRepositoryV3 quizJpaRepository;
    @Mock private QuizAttemptJpaRepository quizAttemptJpaRepository;
    @Mock private PaymentTransactionJpaRepository paymentTransactionJpaRepository;

    @InjectMocks
    private StudentEnrollmentControllerV3 controller;

    @Test
    @DisplayName("course progress should treat dropped enrollment as not enrolled")
    void getCourseProgressTreatsDroppedEnrollmentAsNotEnrolled() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UserJpaEntity student = student(studentId);
        Enrollment droppedEnrollment = Enrollment.builder()
                .id(UUID.randomUUID())
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.DROPPED)
                .build();

        when(enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId))
                .thenReturn(Optional.of(droppedEnrollment));

        var response = controller.getCourseProgress(student, courseId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getData().getStatus()).isEqualTo("not_enrolled");
        assertThat(response.getBody().getData().getProgressPercentage()).isZero();
    }

    @Test
    @DisplayName("completed ids should be empty for dropped enrollment")
    void getCompletedLessonIdsIgnoresDroppedEnrollment() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UserJpaEntity student = student(studentId);
        Enrollment droppedEnrollment = Enrollment.builder()
                .id(UUID.randomUUID())
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.DROPPED)
                .build();

        when(enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId))
                .thenReturn(Optional.of(droppedEnrollment));

        var response = controller.getCompletedLessonIds(student, courseId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getData()).isEqualTo(List.of());
    }

    private UserJpaEntity student(UUID id) {
        UserJpaEntity user = new UserJpaEntity();
        user.setId(id);
        user.setRole(UserJpaEntity.UserRole.STUDENT);
        user.setEmail("student@maritime.edu");
        user.setFullName("Student");
        return user;
    }
}
