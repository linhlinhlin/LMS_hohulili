package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.application.usecase.*;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaLearningClassRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity;
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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Security tests for ClassControllerV3 ownership checks (P0-13).
 */
@ExtendWith(MockitoExtension.class)
class ClassControllerSecurityTest {

    @Mock private CreateLearningClassUseCaseV3 createLearningClassUseCase;
    @Mock private UpdateLearningClassUseCase updateLearningClassUseCase;
    @Mock private DeleteLearningClassUseCase deleteLearningClassUseCase;
    @Mock private GetLearningClassByIdUseCase getLearningClassByIdUseCase;
    @Mock private EnrollStudentByEmailUseCase enrollStudentByEmailUseCase;
    @Mock private GetClassStudentsUseCase getClassStudentsUseCase;
    @Mock private DropStudentUseCase dropStudentUseCase;
    @Mock private JpaLearningClassRepository classJpaRepository;
    @Mock private JpaCourseRepository courseJpaRepository;

    @InjectMocks
    private ClassControllerV3 controller;

    private UUID courseId;
    private UUID teacherId;
    private UUID otherTeacherId;
    private UserJpaEntity otherTeacher;
    private CourseJpaEntity course;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();
        teacherId = UUID.randomUUID();
        otherTeacherId = UUID.randomUUID();

        otherTeacher = mock(UserJpaEntity.class);
        lenient().when(otherTeacher.getId()).thenReturn(otherTeacherId);
        lenient().when(otherTeacher.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);

        course = mock(CourseJpaEntity.class);
        lenient().when(course.getTeacherId()).thenReturn(teacherId);
    }

    @Test
    @DisplayName("createClass: Từ chối khi teacher không sở hữu khóa học")
    void createClass_verifiesCourseOwnership() {
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));

        var request = new ClassControllerV3.CreateClassRequest();
        request.setName("Lớp 1A");
        request.setCourseId(courseId.toString());

        assertThatThrownBy(() -> controller.createClass(request, otherTeacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không sở hữu khóa học này");
    }

    @Test
    @DisplayName("updateClass: Từ chối khi teacher không sở hữu khóa học")
    void updateClass_verifiesCourseOwnership() {
        UUID classId = UUID.randomUUID();
        var classEntity = mock(LearningClassJpaEntity.class);
        when(classEntity.getCourseId()).thenReturn(courseId);
        when(classJpaRepository.findById(classId)).thenReturn(Optional.of(classEntity));
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));

        var request = new ClassControllerV3.UpdateClassRequest();

        assertThatThrownBy(() -> controller.updateClass(classId.toString(), request, otherTeacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không sở hữu khóa học này");
    }

    @Test
    @DisplayName("deleteClass: Từ chối khi teacher không sở hữu khóa học")
    void deleteClass_verifiesCourseOwnership() {
        UUID classId = UUID.randomUUID();
        var classEntity = mock(LearningClassJpaEntity.class);
        when(classEntity.getCourseId()).thenReturn(courseId);
        when(classJpaRepository.findById(classId)).thenReturn(Optional.of(classEntity));
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> controller.deleteClass(classId.toString(), otherTeacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không sở hữu khóa học này");
    }

    // ================================================================================================
    // S85: Read endpoint IDOR tests
    // ================================================================================================

    @Test
    @DisplayName("getClassesByCourse: Từ chối khi teacher không sở hữu khóa học")
    void getClassesByCourse_rejectsNonOwner() {
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> controller.getClassesByCourse(courseId, otherTeacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không sở hữu khóa học này");
    }

    @Test
    @DisplayName("searchClassesByCourse: Từ chối khi teacher không sở hữu khóa học")
    void searchClassesByCourse_rejectsNonOwner() {
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> controller.searchClassesByCourse(courseId, otherTeacher, null, null, null, 0, 10))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không sở hữu khóa học này");
    }

    @Test
    @DisplayName("getClassById: Từ chối khi teacher không sở hữu khóa học")
    void getClassById_rejectsNonOwner() {
        UUID classId = UUID.randomUUID();
        var classEntity = mock(LearningClassJpaEntity.class);
        when(classEntity.getCourseId()).thenReturn(courseId);
        when(classJpaRepository.findById(classId)).thenReturn(Optional.of(classEntity));
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> controller.getClassById(classId.toString(), otherTeacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không sở hữu khóa học này");
    }

    @Test
    @DisplayName("getClassStudents: Từ chối khi teacher không sở hữu khóa học")
    void getClassStudents_rejectsNonOwner() {
        UUID classId = UUID.randomUUID();
        var classEntity = mock(LearningClassJpaEntity.class);
        when(classEntity.getCourseId()).thenReturn(courseId);
        when(classJpaRepository.findById(classId)).thenReturn(Optional.of(classEntity));
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> controller.getClassStudents(classId.toString(), 0, 10, otherTeacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không sở hữu khóa học này");
    }

    @Test
    @DisplayName("getClassesByCourse: ADMIN bỏ qua kiểm tra quyền sở hữu")
    void getClassesByCourse_allowsAdmin() {
        var admin = mock(UserJpaEntity.class);
        when(admin.getRole()).thenReturn(UserJpaEntity.UserRole.ADMIN);
        when(classJpaRepository.findByCourseId(courseId)).thenReturn(List.of());

        assertThatCode(() -> controller.getClassesByCourse(courseId, admin))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("getClassesByCourse: Chủ sở hữu khóa học được truy cập")
    void getClassesByCourse_allowsOwner() {
        var owner = mock(UserJpaEntity.class);
        when(owner.getId()).thenReturn(teacherId);
        when(owner.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));
        when(classJpaRepository.findByCourseId(courseId)).thenReturn(List.of());

        assertThatCode(() -> controller.getClassesByCourse(courseId, owner))
                .doesNotThrowAnyException();
    }
}
