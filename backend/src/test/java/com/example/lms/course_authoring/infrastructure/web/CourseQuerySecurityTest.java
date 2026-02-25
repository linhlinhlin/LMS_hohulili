package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CategoryJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.EnrollmentRepositoryImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Security tests for CourseQueryControllerV3 ownership checks on
 * getCourseClasses() and searchCourseClasses() endpoints.
 */
@ExtendWith(MockitoExtension.class)
class CourseQuerySecurityTest {

    @Mock private CourseRepository courseRepository;
    @Mock private LessonJpaRepository lessonRepository;
    @Mock private LearningClassRepository learningClassRepository;
    @Mock private EnrollmentRepositoryImpl enrollmentRepository;
    @Mock private ChapterJpaRepository chapterRepository;
    @Mock private UserJpaRepository userJpaRepository;
    @Mock private CategoryJpaRepository categoryJpaRepository;
    @Mock private UserJpaRepository userRepository;

    @InjectMocks
    private CourseQueryControllerV3 controller;

    private UUID courseId;
    private UUID ownerId;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();
        ownerId = UUID.randomUUID();
    }

    @Test
    @DisplayName("getCourseClasses: Từ chối khi không phải chủ sở hữu")
    void getCourseClasses_rejectsNonOwner() {
        UserJpaEntity otherTeacher = mock(UserJpaEntity.class);
        when(otherTeacher.getId()).thenReturn(UUID.randomUUID());
        when(otherTeacher.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);

        Course course = mock(Course.class);
        when(course.getTeacherId()).thenReturn(ownerId);
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> controller.getCourseClasses(courseId, otherTeacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không sở hữu khóa học này");
    }

    @Test
    @DisplayName("getCourseClasses: Cho phép chủ sở hữu xem lớp học")
    void getCourseClasses_allowsOwner() {
        UserJpaEntity owner = mock(UserJpaEntity.class);
        when(owner.getId()).thenReturn(ownerId);
        when(owner.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);

        Course course = mock(Course.class);
        when(course.getTeacherId()).thenReturn(ownerId);
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
        when(learningClassRepository.findByCourseId(courseId)).thenReturn(List.of());

        assertThatCode(() -> controller.getCourseClasses(courseId, owner))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("searchCourseClasses: Từ chối khi không phải chủ sở hữu")
    void searchCourseClasses_rejectsNonOwner() {
        UserJpaEntity otherTeacher = mock(UserJpaEntity.class);
        when(otherTeacher.getId()).thenReturn(UUID.randomUUID());
        when(otherTeacher.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);

        Course course = mock(Course.class);
        when(course.getTeacherId()).thenReturn(ownerId);
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> controller.searchCourseClasses(courseId, null, null, null, 0, 10, otherTeacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không sở hữu khóa học này");
    }

    @Test
    @DisplayName("getCourseClasses: Admin bỏ qua kiểm tra sở hữu")
    void getCourseClasses_allowsAdmin() {
        UserJpaEntity admin = mock(UserJpaEntity.class);
        when(admin.getRole()).thenReturn(UserJpaEntity.UserRole.ADMIN);

        when(learningClassRepository.findByCourseId(courseId)).thenReturn(List.of());

        assertThatCode(() -> controller.getCourseClasses(courseId, admin))
                .doesNotThrowAnyException();
    }
}
