package com.example.lms.course_authoring.infrastructure.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.lms.course_authoring.application.usecase.CreateChapterUseCaseV3;
import com.example.lms.course_authoring.application.usecase.CreateLessonUseCaseV3;
import com.example.lms.course_authoring.application.usecase.DeleteChapterUseCase;
import com.example.lms.course_authoring.application.usecase.DeleteLessonUseCase;
import com.example.lms.course_authoring.application.usecase.CourseDraftMutationService;
import com.example.lms.course_authoring.application.usecase.UpdateChapterUseCase;
import com.example.lms.course_authoring.application.usecase.UpdateCourseUseCase;
import com.example.lms.course_authoring.application.usecase.UpdateLessonUseCase;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.infrastructure.service.FileManagementService;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

    @Mock
    private CourseDraftMutationService courseDraftMutationService;

    private CourseAuthoringControllerV3 controller;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
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
                courseRepository,
                courseDraftMutationService,
                objectMapper
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

    @Test
    @DisplayName("Should preserve nested quiz questionIds when updating section via multipart JSON")
    void shouldPreserveNestedQuizQuestionIdsWhenUpdatingSectionViaMultipartJson() throws Exception {
        UUID lessonId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        String sectionId = "section-quiz-1";
        String questionId = UUID.randomUUID().toString();

        UserJpaEntity user = new UserJpaEntity();
        user.setId(userId);
        user.setRole(UserJpaEntity.UserRole.TEACHER);

        when(manageContentBlockUseCase.updateBlock(eq(lessonId), eq(sectionId), anyMap(), eq(userId), eq(false)))
                .thenReturn(ContentBlock.of(sectionId, "QUIZ", Map.of()));

        MockMultipartFile dataPart = new MockMultipartFile(
                "data",
                "data",
                MediaType.APPLICATION_JSON_VALUE,
                ("""
                {
                  "lessonId": "%s",
                  "title": "Quiz section",
                  "type": "QUIZ",
                  "isRequired": true,
                  "quizData": {
                    "quizType": "ASSESSMENT",
                    "timeLimitMinutes": 15,
                    "passingScore": 60,
                    "maxAttempts": 2,
                    "shuffleQuestions": true,
                    "shuffleOptions": true,
                    "showResultsImmediately": true,
                    "questionIds": ["%s"]
                  }
                }
                """.formatted(lessonId, questionId)).getBytes(StandardCharsets.UTF_8)
        );

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();

        try {
            SecurityContextHolder.getContext()
                    .setAuthentication(new UsernamePasswordAuthenticationToken(user, null));

            mockMvc.perform(
                            multipart("/api/v3/courses/lessons/{lessonId}/sections/{sectionId}", lessonId, sectionId)
                                    .file(dataPart)
                                    .with(request -> {
                                        request.setMethod("PUT");
                                        return request;
                                    })
                    )
                    .andExpect(status().isOk());
        } finally {
            SecurityContextHolder.clearContext();
        }

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass((Class) Map.class);
        verify(manageContentBlockUseCase).updateBlock(eq(lessonId), eq(sectionId), payloadCaptor.capture(), eq(userId), eq(false));

        @SuppressWarnings("unchecked")
        Map<String, Object> quizData = (Map<String, Object>) payloadCaptor.getValue().get("quizData");
        assertThat(quizData).isNotNull();
        assertThat(quizData.get("questionIds")).isEqualTo(List.of(questionId));
    }
}
