package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizAttemptJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizJpaRepositoryV3;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.course_authoring.infrastructure.service.CoursePublicationService;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.application.usecase.CertificateUseCase;
import com.example.lms.learning_delivery.application.usecase.SelfEnrollUseCase;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.EnrollmentRepositoryImpl;
import com.example.lms.learning_delivery.infrastructure.persistence.CertificateJpaRepository;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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
    @Mock private CoursePublicationService coursePublicationService;

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

    @Test
    @DisplayName("enrolled course search should match Vietnamese titles without diacritics")
    void getEnrolledCoursesSearchMatchesVietnameseTitleWithoutDiacritics() {
        UUID studentId = UUID.randomUUID();
        UUID maritimeCourseId = UUID.randomUUID();
        UUID logisticsCourseId = UUID.randomUUID();
        UserJpaEntity student = student(studentId);

        Enrollment maritimeEnrollment = enrollmentForCourse(studentId, maritimeCourseId);
        Enrollment logisticsEnrollment = enrollmentForCourse(studentId, logisticsCourseId);
        CourseJpaEntity maritimeCourse = CourseJpaEntity.builder()
                .id(maritimeCourseId)
                .title("Hàng hải căn bản")
                .build();
        CourseJpaEntity logisticsCourse = CourseJpaEntity.builder()
                .id(logisticsCourseId)
                .title("Port logistics")
                .build();

        when(enrollmentRepository.findActiveAndCompletedWithClass(studentId))
                .thenReturn(List.of(maritimeEnrollment, logisticsEnrollment));
        when(courseJpaRepository.findAllById(any()))
                .thenReturn(List.of(maritimeCourse, logisticsCourse));
        when(userJpaRepository.findAllById(any())).thenReturn(List.of());
        when(chapterJpaRepository.findByCourseIdInOrderByOrderIndex(any())).thenReturn(List.of());
        when(paymentTransactionJpaRepository.findPaidCourseIds(eq(studentId), any(), any()))
                .thenReturn(List.of());

        var response = controller.getEnrolledCourses(
                student,
                0,
                20,
                "hang hai",
                null,
                null,
                "recent",
                "desc"
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getData().getTotalElements()).isEqualTo(1);
        assertThat(response.getBody().getData().getContent())
                .extracting(StudentEnrollmentControllerV3.EnrolledCourseResponse::getTitle)
                .containsExactly("Hàng hải căn bản");
    }

    @Test
    @DisplayName("enrolled course thumbnail should use the student's published snapshot")
    void getEnrolledCoursesUsesPublishedThumbnailSnapshot() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UserJpaEntity student = student(studentId);
        Enrollment enrollment = enrollmentForCourse(studentId, courseId);
        CourseJpaEntity course = CourseJpaEntity.builder()
                .id(courseId)
                .title("Weather routing")
                .description("Route monitoring course")
                .build();
        course.setThumbnailUrl("https://cdn.example.com/draft-cover.jpg");

        when(enrollmentRepository.findActiveAndCompletedWithClass(studentId))
                .thenReturn(List.of(enrollment));
        when(courseJpaRepository.findAllById(any())).thenReturn(List.of(course));
        when(userJpaRepository.findAllById(any())).thenReturn(List.of());
        when(chapterJpaRepository.findByCourseIdInOrderByOrderIndex(any())).thenReturn(List.of());
        when(paymentTransactionJpaRepository.findPaidCourseIds(eq(studentId), any(), any()))
                .thenReturn(List.of());
        when(coursePublicationService.getPublishedDetails(any(), eq(studentId)))
                .thenReturn(Map.of(
                        courseId,
                        Map.of("thumbnailUrl", "https://cdn.example.com/published-cover.jpg")
                ));

        var response = controller.getEnrolledCourses(
                student,
                0,
                20,
                null,
                null,
                null,
                "recent",
                "desc"
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getData().getContent())
                .extracting(StudentEnrollmentControllerV3.EnrolledCourseResponse::getThumbnailUrl)
                .containsExactly("https://cdn.example.com/published-cover.jpg");
    }

    @Test
    @DisplayName("enrolled course thumbnail should match the course cover image")
    void getEnrolledCoursesUsesCourseThumbnailOnly() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UserJpaEntity student = student(studentId);
        Enrollment enrollment = enrollmentForCourse(studentId, courseId);
        CourseJpaEntity course = CourseJpaEntity.builder()
                .id(courseId)
                .title("Weather routing")
                .description("Route monitoring course")
                .introVideoUrl("https://youtube.com/watch?v=intro")
                .build();
        course.setThumbnailUrl(null);

        when(enrollmentRepository.findActiveAndCompletedWithClass(studentId))
                .thenReturn(List.of(enrollment));
        when(courseJpaRepository.findAllById(any())).thenReturn(List.of(course));
        when(userJpaRepository.findAllById(any())).thenReturn(List.of());
        when(chapterJpaRepository.findByCourseIdInOrderByOrderIndex(any())).thenReturn(List.of());
        when(paymentTransactionJpaRepository.findPaidCourseIds(eq(studentId), any(), any()))
                .thenReturn(List.of());

        var response = controller.getEnrolledCourses(
                student,
                0,
                20,
                null,
                null,
                null,
                "recent",
                "desc"
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getData().getContent())
                .extracting(StudentEnrollmentControllerV3.EnrolledCourseResponse::getThumbnailUrl)
                .containsExactly((String) null);
    }

    @Test
    @DisplayName("issue certificate should return business error when required exam is not passed")
    void issueCertificateReturnsBusinessErrorWhenIneligible() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UserJpaEntity student = student(studentId);

        Enrollment enrollment = Enrollment.builder()
                .id(enrollmentId)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .completionPercent(100)
                .learningClass(LearningClass.builder()
                        .id(UUID.randomUUID())
                        .courseId(courseId)
                        .name("Lớp học")
                        .build())
                .enrolledAt(Instant.now())
                .build();

        when(enrollmentRepository.findActiveWithClass(studentId)).thenReturn(List.of(enrollment));
        when(certificateRepository.existsByEnrollmentId(enrollmentId)).thenReturn(false);
        when(certificateUseCase.issueIfNotExists(enrollmentId, studentId, courseId))
                .thenThrow(new IllegalStateException("Bạn cần vượt qua bài thi chứng chỉ"));

        var response = controller.issueCertificate(student, enrollmentId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).isEqualTo("Bạn cần vượt qua bài thi chứng chỉ");
        verify(certificateRepository, never()).findByEnrollmentId(enrollmentId);
    }

    @Test
    @DisplayName("mark lesson complete should preserve progress details and hydrate completed sections")
    void markLessonCompletePreservesProgressAndCompletedSections() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        UserJpaEntity student = student(studentId);
        CourseJpaEntity course = CourseJpaEntity.builder().id(courseId).title("Course").build();

        Enrollment enrollment = Enrollment.builder()
                .id(UUID.randomUUID())
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .learningClass(LearningClass.builder()
                        .id(UUID.randomUUID())
                        .courseId(courseId)
                        .name("Class")
                        .build())
                .progress(Map.of(
                        lessonId.toString(),
                        Enrollment.LessonProgress.builder()
                                .status("IN_PROGRESS")
                                .watchSeconds(123)
                                .completedSections(List.of("section-a"))
                                .lastActivity(Instant.now())
                                .build()
                ))
                .build();

        LessonJpaEntity lesson = LessonJpaEntity.builder()
                .id(lessonId)
                .chapterId(UUID.randomUUID())
                .title("Lesson")
                .contentBlocks(List.of(
                        ContentBlock.of("section-a", "VIDEO", Map.of()),
                        ContentBlock.of("section-b", "TEXT", Map.of())
                ))
                .build();

        when(courseJpaRepository.findByLessonId(lessonId)).thenReturn(Optional.of(course));
        when(enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId)).thenReturn(Optional.of(enrollment));
        when(lessonJpaRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(chapterJpaRepository.findByCourseIdOrderByOrderIndex(courseId)).thenReturn(List.of());
        when(enrollmentRepository.save(enrollment)).thenAnswer(invocation -> invocation.getArgument(0));

        var response = controller.markLessonComplete(student, lessonId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        var savedProgress = enrollment.getProgress().get(lessonId.toString());
        assertThat(savedProgress.getStatus()).isEqualTo("COMPLETED");
        assertThat(savedProgress.getWatchSeconds()).isEqualTo(123);
        assertThat(savedProgress.getCompletedSections()).containsExactly("section-a", "section-b");
    }

    @Test
    @DisplayName("mark lesson complete should retry once after optimistic lock with fresh enrollment")
    void markLessonCompleteRetriesOnOptimisticLock() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        UserJpaEntity student = student(studentId);
        CourseJpaEntity course = CourseJpaEntity.builder().id(courseId).title("Course").build();

        Enrollment staleEnrollment = Enrollment.builder()
                .id(UUID.randomUUID())
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .learningClass(LearningClass.builder()
                        .id(UUID.randomUUID())
                        .courseId(courseId)
                        .name("Class")
                        .build())
                .build();
        Enrollment freshEnrollment = Enrollment.builder()
                .id(UUID.randomUUID())
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .learningClass(LearningClass.builder()
                        .id(UUID.randomUUID())
                        .courseId(courseId)
                        .name("Class")
                        .build())
                .progress(Map.of(
                        lessonId.toString(),
                        Enrollment.LessonProgress.builder()
                                .status("IN_PROGRESS")
                                .completedSections(List.of("section-a"))
                                .build()
                ))
                .build();

        LessonJpaEntity lesson = LessonJpaEntity.builder()
                .id(lessonId)
                .chapterId(UUID.randomUUID())
                .title("Lesson")
                .contentBlocks(List.of(
                        ContentBlock.of("section-a", "VIDEO", Map.of()),
                        ContentBlock.of("section-b", "TEXT", Map.of())
                ))
                .build();

        when(courseJpaRepository.findByLessonId(lessonId)).thenReturn(Optional.of(course));
        when(enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId))
                .thenReturn(Optional.of(staleEnrollment))
                .thenReturn(Optional.of(freshEnrollment));
        when(lessonJpaRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(chapterJpaRepository.findByCourseIdOrderByOrderIndex(courseId)).thenReturn(List.of());
        when(enrollmentRepository.save(staleEnrollment))
                .thenThrow(new ObjectOptimisticLockingFailureException("Enrollment", staleEnrollment.getId()));
        when(enrollmentRepository.save(freshEnrollment)).thenAnswer(invocation -> invocation.getArgument(0));

        var response = controller.markLessonComplete(student, lessonId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(freshEnrollment.getProgress().get(lessonId.toString()).getCompletedSections())
                .containsExactly("section-a", "section-b");
        verify(enrollmentRepository).save(staleEnrollment);
        verify(enrollmentRepository).save(freshEnrollment);
    }

    @Test
    @DisplayName("mark section complete should be idempotent when section is already completed")
    void markSectionCompleteReturnsSuccessWhenAlreadyCompleted() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        UserJpaEntity student = student(studentId);
        CourseJpaEntity course = CourseJpaEntity.builder().id(courseId).title("Course").build();

        Enrollment enrollment = Enrollment.builder()
                .id(UUID.randomUUID())
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .learningClass(LearningClass.builder()
                        .id(UUID.randomUUID())
                        .courseId(courseId)
                        .name("Class")
                        .build())
                .progress(Map.of(
                        lessonId.toString(),
                        Enrollment.LessonProgress.builder()
                                .status("IN_PROGRESS")
                                .completedSections(List.of("section-a"))
                                .lastActivity(Instant.now())
                                .build()
                ))
                .build();

        when(courseJpaRepository.findByLessonId(lessonId)).thenReturn(Optional.of(course));
        when(enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId)).thenReturn(Optional.of(enrollment));

        var response = controller.markSectionComplete(student, lessonId, "section-a");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getData().get("completedSections")).isEqualTo(List.of("section-a"));
        verify(enrollmentRepository, never()).save(enrollment);
    }

    @Test
    @DisplayName("mark section complete should retry once after optimistic lock and converge")
    void markSectionCompleteRetriesOnOptimisticLock() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        UserJpaEntity student = student(studentId);
        CourseJpaEntity course = CourseJpaEntity.builder().id(courseId).title("Course").build();

        Enrollment staleEnrollment = Enrollment.builder()
                .id(UUID.randomUUID())
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .learningClass(LearningClass.builder()
                        .id(UUID.randomUUID())
                        .courseId(courseId)
                        .name("Class")
                        .build())
                .build();
        Enrollment freshEnrollment = Enrollment.builder()
                .id(UUID.randomUUID())
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .learningClass(LearningClass.builder()
                        .id(UUID.randomUUID())
                        .courseId(courseId)
                        .name("Class")
                        .build())
                .progress(Map.of(
                        lessonId.toString(),
                        Enrollment.LessonProgress.builder()
                                .status("IN_PROGRESS")
                                .completedSections(List.of("section-a"))
                                .build()
                ))
                .build();

        when(courseJpaRepository.findByLessonId(lessonId)).thenReturn(Optional.of(course));
        when(enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId))
                .thenReturn(Optional.of(staleEnrollment))
                .thenReturn(Optional.of(freshEnrollment));
        when(enrollmentRepository.save(staleEnrollment))
                .thenThrow(new ObjectOptimisticLockingFailureException("Enrollment", staleEnrollment.getId()));
        var response = controller.markSectionComplete(student, lessonId, "section-a");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(freshEnrollment.getProgress().get(lessonId.toString()).getCompletedSections())
                .containsExactly("section-a");
        verify(enrollmentRepository).save(staleEnrollment);
        verify(enrollmentRepository, never()).save(freshEnrollment);
    }

    private UserJpaEntity student(UUID id) {
        UserJpaEntity user = new UserJpaEntity();
        user.setId(id);
        user.setRole(UserJpaEntity.UserRole.STUDENT);
        user.setEmail("student@maritime.edu");
        user.setFullName("Student");
        return user;
    }

    private Enrollment enrollmentForCourse(UUID studentId, UUID courseId) {
        return Enrollment.builder()
                .id(UUID.randomUUID())
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .completionPercent(0)
                .learningClass(LearningClass.builder()
                        .id(UUID.randomUUID())
                        .courseId(courseId)
                        .name("Class")
                        .build())
                .enrolledAt(Instant.now())
                .build();
    }
}
