package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.application.dto.CourseDTOs;
import com.example.lms.course_authoring.application.usecase.CourseAuthoringUseCase;
import com.example.lms.course_authoring.application.usecase.GetCourseDraftUseCase;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseReviewEventJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseReviewJpaRepository;
import com.example.lms.course_authoring.infrastructure.service.CoursePublicationService;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.ClassTeacherJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.EnrollmentRepositoryImpl;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.service.AdaptiveVideoPlaybackService;
import com.example.lms.learning_delivery.infrastructure.service.VideoAssetPresentationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Security tests for TeacherCoursesControllerV3 ownership checks.
 */
@ExtendWith(MockitoExtension.class)
class TeacherCoursesSecurityTest {

    private static final String COURSE_ACCESS_DENIED_MESSAGE = "quyền truy cập khóa học";

    @Mock private CourseAuthoringUseCase courseAuthoringUseCase;
    @Mock private GetCourseDraftUseCase getCourseDraftUseCase;
    @Mock private EnrollmentRepositoryImpl enrollmentRepository;
    @Mock private UserJpaRepository userRepository;
    @Mock private JpaCourseRepository jpaCourseRepository;
    @Mock private JpaEnrollmentRepository jpaEnrollmentRepository;
    @Mock private CourseReviewJpaRepository courseReviewRepository;
    @Mock private CoursePublicationService coursePublicationService;
    @Mock private VideoAssetPresentationService videoAssetPresentationService;
    @Mock private AdaptiveVideoPlaybackService adaptiveVideoPlaybackService;
    @Mock private ClassTeacherJpaRepository classTeacherJpaRepository;
    @Mock private CourseReviewEventJpaRepository reviewEventRepository;

    @InjectMocks
    private TeacherCoursesControllerV3 controller;

    private UserJpaEntity otherTeacher;
    private UserJpaEntity admin;
    private UUID courseId;
    private CourseJpaEntity course;
    private UUID teacherId;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();
        teacherId = UUID.randomUUID();
    }

    @Test
    @DisplayName("updateCourse: rejects non-owner")
    void updateCourse_rejectsNonOwner() {
        otherTeacher = mock(UserJpaEntity.class);
        when(otherTeacher.getId()).thenReturn(UUID.randomUUID());
        when(otherTeacher.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);

        course = mock(CourseJpaEntity.class);
        when(course.getTeacherId()).thenReturn(teacherId);
        when(jpaCourseRepository.findById(courseId)).thenReturn(Optional.of(course));
        var request = mock(CourseDTOs.UpdateCourseRequest.class);

        assertThatThrownBy(() -> controller.updateCourse(courseId, request, otherTeacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining(COURSE_ACCESS_DENIED_MESSAGE);
    }

    @Test
    @DisplayName("deleteCourse: rejects non-owner")
    void deleteCourse_rejectsNonOwner() {
        otherTeacher = mock(UserJpaEntity.class);
        when(otherTeacher.getId()).thenReturn(UUID.randomUUID());
        when(otherTeacher.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);

        course = mock(CourseJpaEntity.class);
        when(course.getTeacherId()).thenReturn(teacherId);
        when(jpaCourseRepository.findById(courseId)).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> controller.deleteCourse(courseId, otherTeacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining(COURSE_ACCESS_DENIED_MESSAGE);
    }

    @Test
    @DisplayName("deleteCourse: admin bypasses ownership")
    void adminBypassesOwnership() {
        admin = mock(UserJpaEntity.class);
        when(admin.getRole()).thenReturn(UserJpaEntity.UserRole.ADMIN);

        assertThatCode(() -> controller.deleteCourse(courseId, admin))
                .doesNotThrowAnyException();
        verify(courseAuthoringUseCase).deleteCourse(courseId);
    }
}
