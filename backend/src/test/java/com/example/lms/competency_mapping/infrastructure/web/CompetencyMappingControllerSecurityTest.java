package com.example.lms.competency_mapping.infrastructure.web;

import com.example.lms.competency_mapping.application.port.LessonQueryPort;
import com.example.lms.competency_mapping.application.usecase.ExportCompetencyMapUseCase;
import com.example.lms.competency_mapping.application.usecase.GetCompetenciesUseCase;
import com.example.lms.competency_mapping.application.usecase.GetCourseCompetencyMapUseCase;
import com.example.lms.competency_mapping.application.usecase.GetLessonCompetenciesUseCase;
import com.example.lms.competency_mapping.application.usecase.GetStandardsUseCase;
import com.example.lms.competency_mapping.application.usecase.UpdateLessonCompetenciesUseCase;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CompetencyMappingControllerSecurityTest {

    @Mock private GetStandardsUseCase getStandards;
    @Mock private GetCompetenciesUseCase getCompetencies;
    @Mock private GetCourseCompetencyMapUseCase getCourseMap;
    @Mock private UpdateLessonCompetenciesUseCase updateLessonCompetencies;
    @Mock private GetLessonCompetenciesUseCase getLessonCompetencies;
    @Mock private ExportCompetencyMapUseCase exportMap;
    @Mock private LessonQueryPort lessonQueryPort;

    private CompetencyMappingController controller;
    private UUID courseId;
    private UUID lessonId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        controller = new CompetencyMappingController(
                getStandards,
                getCompetencies,
                getCourseMap,
                updateLessonCompetencies,
                getLessonCompetencies,
                exportMap,
                lessonQueryPort
        );
        courseId = UUID.randomUUID();
        lessonId = UUID.randomUUID();
        userId = UUID.randomUUID();
    }

    @Test
    @DisplayName("course map: enrolled student can read")
    void courseMap_enrolledStudentCanRead() {
        var student = user(UserJpaEntity.UserRole.STUDENT);
        when(lessonQueryPort.isStudentEnrolledInCourse(courseId, userId)).thenReturn(true);

        assertThatCode(() -> controller.getCourseCompetencyMap(courseId, student))
                .doesNotThrowAnyException();

        verify(getCourseMap).execute(courseId);
    }

    @Test
    @DisplayName("course map: non-enrolled student is rejected")
    void courseMap_nonEnrolledStudentRejected() {
        var student = user(UserJpaEntity.UserRole.STUDENT);
        when(lessonQueryPort.isStudentEnrolledInCourse(courseId, userId)).thenReturn(false);

        assertThatThrownBy(() -> controller.getCourseCompetencyMap(courseId, student))
                .isInstanceOf(AccessDeniedException.class);

        verify(getCourseMap, never()).execute(courseId);
    }

    @Test
    @DisplayName("course map: assigned teacher can read")
    void courseMap_assignedTeacherCanRead() {
        var teacher = user(UserJpaEntity.UserRole.TEACHER);
        when(lessonQueryPort.canTeachCourse(courseId, userId)).thenReturn(true);

        assertThatCode(() -> controller.getCourseCompetencyMap(courseId, teacher))
                .doesNotThrowAnyException();

        verify(getCourseMap).execute(courseId);
    }

    @Test
    @DisplayName("course map: unrelated teacher is rejected")
    void courseMap_unrelatedTeacherRejected() {
        var teacher = user(UserJpaEntity.UserRole.TEACHER);
        when(lessonQueryPort.canTeachCourse(courseId, userId)).thenReturn(false);

        assertThatThrownBy(() -> controller.getCourseCompetencyMap(courseId, teacher))
                .isInstanceOf(AccessDeniedException.class);

        verify(getCourseMap, never()).execute(courseId);
    }

    @Test
    @DisplayName("lesson competencies: enrolled student can read")
    void lessonCompetencies_enrolledStudentCanRead() {
        var student = user(UserJpaEntity.UserRole.STUDENT);
        when(lessonQueryPort.isStudentEnrolledInLesson(lessonId, userId)).thenReturn(true);
        when(getLessonCompetencies.execute(lessonId)).thenReturn(List.of());

        assertThatCode(() -> controller.getLessonCompetencies(lessonId, student))
                .doesNotThrowAnyException();

        verify(getLessonCompetencies).execute(lessonId);
    }

    @Test
    @DisplayName("lesson competencies: unrelated teacher is rejected")
    void lessonCompetencies_unrelatedTeacherRejected() {
        var teacher = user(UserJpaEntity.UserRole.TEACHER);
        when(lessonQueryPort.canTeachLesson(lessonId, userId)).thenReturn(false);

        assertThatThrownBy(() -> controller.getLessonCompetencies(lessonId, teacher))
                .isInstanceOf(AccessDeniedException.class);

        verify(getLessonCompetencies, never()).execute(lessonId);
    }

    @Test
    @DisplayName("export: student is rejected")
    void export_studentRejected() {
        var student = user(UserJpaEntity.UserRole.STUDENT);

        assertThatThrownBy(() -> controller.exportCsv(courseId, student))
                .isInstanceOf(AccessDeniedException.class);

        verify(exportMap, never()).execute(courseId);
    }

    @Test
    @DisplayName("export: admin bypasses course ownership")
    void export_adminBypassesOwnership() {
        var admin = user(UserJpaEntity.UserRole.ADMIN);
        when(exportMap.execute(courseId)).thenReturn(new byte[0]);

        assertThatCode(() -> controller.exportCsv(courseId, admin))
                .doesNotThrowAnyException();

        verify(exportMap).execute(courseId);
    }

    private UserJpaEntity user(UserJpaEntity.UserRole role) {
        var user = new UserJpaEntity();
        user.setId(userId);
        user.setRole(role);
        return user;
    }
}
