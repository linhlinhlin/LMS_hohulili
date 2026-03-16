package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.application.dto.CourseDTOs;
import com.example.lms.course_authoring.application.usecase.CourseAuthoringUseCase;
import com.example.lms.course_authoring.application.usecase.GetCourseDraftUseCase;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseReviewJpaRepository;
import com.example.lms.course_authoring.infrastructure.service.CoursePublicationService;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.EnrollmentRepositoryImpl;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
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

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.*;

/**
 * Security tests for TeacherCoursesControllerV3 ownership checks (P0-10).
 */
@ExtendWith(MockitoExtension.class)
class TeacherCoursesSecurityTest {

    @Mock private CourseAuthoringUseCase courseAuthoringUseCase;
    @Mock private GetCourseDraftUseCase getCourseDraftUseCase;
    @Mock private EnrollmentRepositoryImpl enrollmentRepository;
    @Mock private UserJpaRepository userRepository;
    @Mock private JpaCourseRepository jpaCourseRepository;
    @Mock private JpaEnrollmentRepository jpaEnrollmentRepository;
    @Mock private CourseReviewJpaRepository courseReviewRepository;
    @Mock private CoursePublicationService coursePublicationService;

    @InjectMocks
    private TeacherCoursesControllerV3 controller;

    private UserJpaEntity teacher;
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
    @DisplayName("updateCourse: Từ chối khi không phải chủ sở hữu")
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
                .hasMessageContaining("Bạn không sở hữu khóa học này");
    }

    @Test
    @DisplayName("deleteCourse: Từ chối khi không phải chủ sở hữu")
    void deleteCourse_rejectsNonOwner() {
        otherTeacher = mock(UserJpaEntity.class);
        when(otherTeacher.getId()).thenReturn(UUID.randomUUID());
        when(otherTeacher.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);

        course = mock(CourseJpaEntity.class);
        when(course.getTeacherId()).thenReturn(teacherId);
        when(jpaCourseRepository.findById(courseId)).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> controller.deleteCourse(courseId, otherTeacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không sở hữu khóa học này");
    }

    @Test
    @DisplayName("Admin bỏ qua kiểm tra sở hữu")
    void adminBypassesOwnership() {
        admin = mock(UserJpaEntity.class);
        when(admin.getRole()).thenReturn(UserJpaEntity.UserRole.ADMIN);

        // Admin should not trigger AccessDeniedException
        assertThatCode(() -> controller.deleteCourse(courseId, admin))
                .doesNotThrowAnyException();
        verify(courseAuthoringUseCase).deleteCourse(courseId);
    }
}
