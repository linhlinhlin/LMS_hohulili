package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.application.usecase.CreateChapterUseCaseV3;
import com.example.lms.course_authoring.application.usecase.CreateLessonUseCaseV3;
import com.example.lms.course_authoring.application.usecase.DeleteChapterUseCase;
import com.example.lms.course_authoring.application.usecase.DeleteLessonUseCase;
import com.example.lms.course_authoring.application.usecase.UpdateChapterUseCase;
import com.example.lms.course_authoring.application.usecase.UpdateCourseUseCase;
import com.example.lms.course_authoring.application.usecase.UpdateLessonUseCase;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.infrastructure.service.FileManagementService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CourseAuthoringControllerV3 Tests")
class CourseAuthoringControllerV3Test {

    @Mock
    private CreateChapterUseCaseV3 createChapterUseCase;

    @Mock
    private CreateLessonUseCaseV3 createLessonUseCase;

    @Mock
    private UpdateChapterUseCase updateChapterUseCase;

    @Mock
    private DeleteChapterUseCase deleteChapterUseCase;

    @Mock
    private UpdateLessonUseCase updateLessonUseCase;

    @Mock
    private DeleteLessonUseCase deleteLessonUseCase;

    @Mock
    private com.example.lms.course_authoring.application.usecase.ManageContentBlockUseCaseV3 manageContentBlockUseCase;

    @Mock
    private UpdateCourseUseCase updateCourseUseCase;

    @Mock
    private FileManagementService fileManagementService;

    @Mock
    private ChapterJpaRepository chapterJpaRepository;

    @Mock
    private LessonJpaRepository lessonJpaRepository;

    @Mock
    private CourseRepository courseRepository;

    private CourseAuthoringControllerV3 controller;

    @BeforeEach
    void setUp() {
        controller = new CourseAuthoringControllerV3(
                createChapterUseCase,
                createLessonUseCase,
                updateChapterUseCase,
                deleteChapterUseCase,
                updateLessonUseCase,
                deleteLessonUseCase,
                manageContentBlockUseCase,
                updateCourseUseCase,
                fileManagementService,
                chapterJpaRepository,
                lessonJpaRepository,
                courseRepository
        );
    }

    @Test
    @DisplayName("Should resolve chapter from lesson when delete request omits chapterId")
    void shouldResolveChapterFromLessonWhenDeleteRequestOmitsChapterId() {
        UUID courseId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        UUID chapterId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        LessonJpaEntity lesson = LessonJpaEntity.builder()
                .id(lessonId)
                .chapterId(chapterId)
                .title("Assignment shell")
                .type(LessonJpaEntity.LessonType.ASSIGNMENT)
                .build();

        UserJpaEntity user = new UserJpaEntity();
        user.setId(userId);
        user.setRole(UserJpaEntity.UserRole.TEACHER);

        when(lessonJpaRepository.findById(lessonId)).thenReturn(Optional.of(lesson));

        controller.deleteLesson(lessonId, courseId, null, user);

        verify(lessonJpaRepository).findById(lessonId);
        verify(deleteLessonUseCase).execute(courseId, chapterId, lessonId, userId, false);
    }

    @Test
    @DisplayName("Should fail fast when delete request omits chapterId and lesson is missing")
    void shouldFailFastWhenDeleteRequestOmitsChapterIdAndLessonIsMissing() {
        UUID courseId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        UserJpaEntity user = new UserJpaEntity();
        user.setId(userId);
        user.setRole(UserJpaEntity.UserRole.TEACHER);

        when(lessonJpaRepository.findById(lessonId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.deleteLesson(lessonId, courseId, null, user))
                .isInstanceOf(EntityNotFoundException.class);

        verify(lessonJpaRepository).findById(lessonId);
        verifyNoInteractions(deleteLessonUseCase);
    }
}
