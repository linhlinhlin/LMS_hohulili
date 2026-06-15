package com.example.lms.course_authoring.infrastructure.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.lms.course_authoring.application.usecase.CreateChapterUseCaseV3;
import com.example.lms.course_authoring.application.usecase.CreateLessonUseCaseV3;
import com.example.lms.course_authoring.application.usecase.DeleteChapterUseCase;
import com.example.lms.course_authoring.application.usecase.DeleteLessonUseCase;
import com.example.lms.course_authoring.application.usecase.CourseDraftMutationUseCase;
import com.example.lms.course_authoring.application.usecase.UpdateChapterUseCase;
import com.example.lms.course_authoring.application.usecase.UpdateCourseUseCase;
import com.example.lms.course_authoring.application.usecase.UpdateLessonUseCase;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoAssetJpaEntity;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.infrastructure.service.FileManagementService;
import com.example.lms.shared.infrastructure.service.PublicAssetUrlService;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
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
    private com.example.lms.learning_delivery.infrastructure.service.VideoAssetLifecycleService videoAssetLifecycleService;

    @Mock
    private ChapterJpaRepository chapterJpaRepository;

    @Mock
    private LessonJpaRepository lessonJpaRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private CourseDraftMutationUseCase courseDraftMutationUseCase;
    @Mock
    private com.example.lms.learning_delivery.infrastructure.persistence.ClassTeacherJpaRepository classTeacherJpaRepository;
    @Mock
    private PublicAssetUrlService publicAssetUrlService;

    private CourseAuthoringControllerV3 controller;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        lenient().when(publicAssetUrlService.resolveCourseThumbnailUrl(any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
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
                new com.example.lms.shared.infrastructure.service.DocumentConversionService("", 64 * 1024 * 1024),
                videoAssetLifecycleService,
                chapterJpaRepository,
                lessonJpaRepository,
                courseRepository,
                courseDraftMutationUseCase,
                objectMapper,
                classTeacherJpaRepository,
                publicAssetUrlService
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

    @Test
    @DisplayName("Should reject creating a new video section from an external URL")
    void shouldRejectCreatingNewVideoSectionFromExternalUrl() {
        UUID lessonId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        UserJpaEntity user = new UserJpaEntity();
        user.setId(userId);
        user.setRole(UserJpaEntity.UserRole.TEACHER);

        var response = controller.addSection(
                lessonId,
                """
                {
                  "lessonId": "%s",
                  "title": "Video legacy",
                  "type": "VIDEO",
                  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                }
                """.formatted(lessonId).getBytes(StandardCharsets.UTF_8),
                null,
                user
        );

        assertThat(response.getStatusCode().is4xxClientError()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).contains("tải lên nội bộ");
        verifyNoInteractions(manageContentBlockUseCase);
    }

    @Test
    @DisplayName("Should allow updating a legacy external video section when the URL is unchanged")
    void shouldAllowUpdatingLegacyExternalVideoSectionWhenUrlIsUnchanged() {
        UUID lessonId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        String sectionId = "legacy-video-1";
        String legacyUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

        UserJpaEntity user = new UserJpaEntity();
        user.setId(userId);
        user.setRole(UserJpaEntity.UserRole.TEACHER);

        when(manageContentBlockUseCase.getBlocks(lessonId))
                .thenReturn(List.of(ContentBlock.of(sectionId, "VIDEO", Map.of("videoUrl", legacyUrl))));
        when(manageContentBlockUseCase.updateBlock(eq(lessonId), eq(sectionId), anyMap(), eq(userId), eq(false)))
                .thenReturn(ContentBlock.of(sectionId, "VIDEO", Map.of("videoUrl", legacyUrl)));

        var response = controller.updateSection(
                lessonId,
                sectionId,
                """
                {
                  "lessonId": "%s",
                  "title": "Video legacy",
                  "type": "VIDEO",
                  "videoUrl": "%s"
                }
                """.formatted(lessonId, legacyUrl).getBytes(StandardCharsets.UTF_8),
                null,
                user
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(manageContentBlockUseCase).getBlocks(lessonId);
        verify(manageContentBlockUseCase).updateBlock(eq(lessonId), eq(sectionId), anyMap(), eq(userId), eq(false));
    }

    @Test
    @DisplayName("Should preserve Vietnamese diacritics khi multipart parse — UTF-8 forced (#277)")
    void shouldPreserveVietnameseDiacriticsInSectionPayload() {
        UUID lessonId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        String sectionId = "vn-section";

        UserJpaEntity user = new UserJpaEntity();
        user.setId(userId);
        user.setRole(UserJpaEntity.UserRole.TEACHER);

        // Full Vietnamese diacritic set + maritime context — lock behavior cho
        // regression: nếu future ai đó đổi parseSectionPayload về String, test
        // này sẽ fail (mojibake "Hàng" → "H?ng" trong captured payload).
        String vnTitle = "Hàng Hải Địa Văn";
        String vnContent = "<h2>Hàng hải địa văn</h2><p>Đây là nội dung tiếng Việt: ăâđêôơưáàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵ</p>";

        // TEXT type → enforceVideoSectionAuthoringPolicy skip getBlocks call.
        when(manageContentBlockUseCase.updateBlock(eq(lessonId), eq(sectionId), anyMap(), eq(userId), eq(false)))
                .thenReturn(ContentBlock.of(sectionId, "TEXT", Map.of("title", vnTitle, "content", vnContent)));

        // Build JSON với UTF-8 bytes — như FE Blob 'application/json; charset=utf-8'.
        String json = """
                {
                  "lessonId": "%s",
                  "title": "%s",
                  "type": "TEXT",
                  "content": "<h2>Hàng hải địa văn</h2><p>Đây là nội dung tiếng Việt: ăâđêôơưáàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵ</p>"
                }
                """.formatted(lessonId, vnTitle);

        var response = controller.updateSection(
                lessonId,
                sectionId,
                json.getBytes(StandardCharsets.UTF_8),
                null,
                user
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();

        // Capture payload Map → assert Vietnamese diacritics preserved bit-by-bit.
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass(Map.class);
        verify(manageContentBlockUseCase)
                .updateBlock(eq(lessonId), eq(sectionId), payloadCaptor.capture(), eq(userId), eq(false));
        Map<String, Object> captured = payloadCaptor.getValue();

        assertThat((String) captured.get("title")).isEqualTo(vnTitle);
        assertThat((String) captured.get("content"))
                .contains("Hàng hải địa văn")
                .contains("Đây là nội dung")
                .contains("ăâđêôơưáàảãạ")
                .doesNotContain("?");  // Mojibake check — UTF-8 → Latin1 produces '?' replacements.
    }

    @Test
    @DisplayName("Should reject creating a new lesson with a legacy video URL")
    void shouldRejectCreatingNewLessonWithLegacyVideoUrl() {
        UUID chapterId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        UserJpaEntity user = new UserJpaEntity();
        user.setId(userId);
        user.setRole(UserJpaEntity.UserRole.TEACHER);

        assertThatThrownBy(() -> controller.createLesson(
                chapterId,
                new CourseAuthoringControllerV3.CreateLessonRequest(
                        "Legacy lesson",
                        "Mo ta",
                        "LECTURE",
                        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                        10,
                        0,
                        false
                ),
                user
        ))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("asset pipeline");

        verifyNoInteractions(createLessonUseCase);
    }

    @Test
    @DisplayName("Should allow updating a legacy lesson when the lesson video URL is unchanged")
    void shouldAllowUpdatingLegacyLessonWhenVideoUrlIsUnchanged() {
        UUID courseId = UUID.randomUUID();
        UUID chapterId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        String legacyUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

        LessonJpaEntity lesson = LessonJpaEntity.builder()
                .id(lessonId)
                .chapterId(chapterId)
                .title("Legacy lesson")
                .videoUrl(legacyUrl)
                .type(LessonJpaEntity.LessonType.LECTURE)
                .build();

        UserJpaEntity user = new UserJpaEntity();
        user.setId(userId);
        user.setRole(UserJpaEntity.UserRole.TEACHER);

        when(lessonJpaRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(updateLessonUseCase.execute(org.mockito.ArgumentMatchers.any()))
                .thenReturn(new com.example.lms.course_authoring.application.dto.LessonResponse(
                        lessonId,
                        "Legacy lesson",
                        "Mo ta",
                        "Noi dung",
                        legacyUrl,
                        "LECTURE",
                        0,
                        10,
                        false,
                        false,
                        0,
                        Instant.now(),
                        Instant.now()
                ));

        var response = controller.updateLesson(
                lessonId,
                new CourseAuthoringControllerV3.UpdateLessonRequest(
                        courseId,
                        chapterId,
                        "Legacy lesson",
                        "Mo ta",
                        "LECTURE",
                        "Noi dung",
                        legacyUrl,
                        10,
                        false,
                        false
                ),
                user
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(lessonJpaRepository).findById(lessonId);
        verify(updateLessonUseCase).execute(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Should reject assigning a new legacy URL to lesson-level video")
    void shouldRejectAssigningNewLegacyUrlToLessonLevelVideo() {
        UUID courseId = UUID.randomUUID();
        UUID chapterId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        LessonJpaEntity lesson = LessonJpaEntity.builder()
                .id(lessonId)
                .chapterId(chapterId)
                .title("Legacy lesson")
                .type(LessonJpaEntity.LessonType.LECTURE)
                .build();

        UserJpaEntity user = new UserJpaEntity();
        user.setId(userId);
        user.setRole(UserJpaEntity.UserRole.TEACHER);

        when(lessonJpaRepository.findById(lessonId)).thenReturn(Optional.of(lesson));

        assertThatThrownBy(() -> controller.updateLesson(
                lessonId,
                new CourseAuthoringControllerV3.UpdateLessonRequest(
                        courseId,
                        chapterId,
                        "Legacy lesson",
                        "Mo ta",
                        "LECTURE",
                        "Noi dung",
                        "https://cdn.example.com/new-video.mp4",
                        10,
                        false,
                        false
                ),
                user
        ))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("video section");

        verify(lessonJpaRepository).findById(lessonId);
        verifyNoInteractions(updateLessonUseCase);
    }

    @Test
    @DisplayName("Should reject assigning a new external intro video URL when no intro asset is provided")
    void shouldRejectAssigningNewExternalIntroVideoUrlWhenNoIntroAssetIsProvided() {
        UUID courseId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        UserJpaEntity user = new UserJpaEntity();
        user.setId(userId);
        user.setRole(UserJpaEntity.UserRole.TEACHER);

        var course = org.mockito.Mockito.mock(com.example.lms.course_authoring.domain.model.Course.class);
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
        when(course.getIntroVideoUrl()).thenReturn(null);

        assertThatThrownBy(() -> controller.updateCourse(
                courseId,
                new CourseAuthoringControllerV3.UpdateCourseRequest(
                        "Khoa hoc",
                        "Mo ta",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                        null,
                        null,
                        null,
                        "FREE",
                        null,
                        null,
                        "SELF_PACED",
                        true
                ),
                user
        ))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("video asset");

        verify(courseRepository).findById(courseId);
        verifyNoInteractions(updateCourseUseCase);
        verifyNoInteractions(videoAssetLifecycleService);
    }

    @Test
    @DisplayName("Should sanitize legacy fields when creating a new video section from a validated asset")
    void shouldSanitizeLegacyFieldsWhenCreatingNewVideoSectionFromValidatedAsset() {
        UUID lessonId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID assetId = UUID.randomUUID();

        UserJpaEntity user = new UserJpaEntity();
        user.setId(userId);
        user.setRole(UserJpaEntity.UserRole.TEACHER);

        when(videoAssetLifecycleService.requireAccessibleAsset(assetId, user))
                .thenReturn(VideoAssetJpaEntity.builder().id(assetId).ownerId(userId).build());
        when(manageContentBlockUseCase.addBlock(eq(lessonId), eq("VIDEO"), anyMap(), eq(userId), eq(false)))
                .thenReturn(ContentBlock.of("section-video-asset", "VIDEO", Map.of("videoAssetId", assetId.toString())));

        var response = controller.addSection(
                lessonId,
                """
                {
                  "lessonId": "%s",
                  "title": "Video asset",
                  "type": "VIDEO",
                  "videoAssetId": "%s",
                  "videoUrl": "https://legacy.example/video.mp4",
                  "streamVideoUid": "legacy-stream-uid",
                  "videoType": "CLOUDFLARE",
                  "cfObjectKey": "videos/legacy.mp4"
                }
                """.formatted(lessonId, assetId).getBytes(StandardCharsets.UTF_8),
                null,
                user
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass((Class) Map.class);
        verify(manageContentBlockUseCase).addBlock(eq(lessonId), eq("VIDEO"), payloadCaptor.capture(), eq(userId), eq(false));
        verify(videoAssetLifecycleService).requireAccessibleAsset(assetId, user);

        assertThat(payloadCaptor.getValue())
                .containsEntry("videoAssetId", assetId.toString())
                .doesNotContainKeys("videoUrl", "streamVideoUid", "videoType", "cfObjectKey");
    }

    @Test
    @DisplayName("Should reject creating a new video section with a manual stream UID")
    void shouldRejectCreatingNewVideoSectionWithManualStreamUid() {
        UUID lessonId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        UserJpaEntity user = new UserJpaEntity();
        user.setId(userId);
        user.setRole(UserJpaEntity.UserRole.TEACHER);

        var response = controller.addSection(
                lessonId,
                """
                {
                  "lessonId": "%s",
                  "title": "Video stream",
                  "type": "VIDEO",
                  "streamVideoUid": "manual-stream-uid"
                }
                """.formatted(lessonId).getBytes(StandardCharsets.UTF_8),
                null,
                user
        );

        assertThat(response.getStatusCode().is4xxClientError()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).contains("streamVideoUid");
        verifyNoInteractions(manageContentBlockUseCase);
    }

    @Test
    @DisplayName("Should allow updating a legacy video section when stream UID is unchanged")
    void shouldAllowUpdatingLegacyVideoSectionWhenStreamUidIsUnchanged() {
        UUID lessonId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        String sectionId = "legacy-stream-section";
        String legacyStreamUid = "legacy-stream-uid";

        UserJpaEntity user = new UserJpaEntity();
        user.setId(userId);
        user.setRole(UserJpaEntity.UserRole.TEACHER);

        when(manageContentBlockUseCase.getBlocks(lessonId))
                .thenReturn(List.of(ContentBlock.of(sectionId, "VIDEO", Map.of("streamVideoUid", legacyStreamUid))));
        when(manageContentBlockUseCase.updateBlock(eq(lessonId), eq(sectionId), anyMap(), eq(userId), eq(false)))
                .thenReturn(ContentBlock.of(sectionId, "VIDEO", Map.of("streamVideoUid", legacyStreamUid)));

        var response = controller.updateSection(
                lessonId,
                sectionId,
                """
                {
                  "lessonId": "%s",
                  "title": "Video stream legacy",
                  "type": "VIDEO",
                  "streamVideoUid": "%s"
                }
                """.formatted(lessonId, legacyStreamUid).getBytes(StandardCharsets.UTF_8),
                null,
                user
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(manageContentBlockUseCase).getBlocks(lessonId);
        verify(manageContentBlockUseCase).updateBlock(eq(lessonId), eq(sectionId), anyMap(), eq(userId), eq(false));
    }
}
