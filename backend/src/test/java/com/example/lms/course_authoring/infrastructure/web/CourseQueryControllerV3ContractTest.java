package com.example.lms.course_authoring.infrastructure.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.lms.assessment.infrastructure.persistence.entity.QuestionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.QuestionJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizJpaRepositoryV3;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.ChapterJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseCategoryJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.course_authoring.infrastructure.service.CoursePublicationService;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.ClassTeacherJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.EnrollmentRepositoryImpl;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.service.VideoAssetPresentationService;
import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.Map;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CourseQueryControllerV3ContractTest {

    @Mock private CourseRepository courseRepository;
    @Mock private LessonJpaRepository lessonRepository;
    @Mock private LearningClassRepository learningClassRepository;
    @Mock private EnrollmentRepositoryImpl enrollmentRepository;
    @Mock private JpaEnrollmentRepository enrollmentJpaRepository;
    @Mock private ChapterJpaRepository chapterRepository;
    @Mock private UserJpaRepository userJpaRepository;
    @Mock private CourseCategoryJpaRepository courseCategoryJpaRepository;
    @Mock private PaymentTransactionJpaRepository paymentRepository;
    @Mock private QuizJpaRepositoryV3 quizJpaRepository;
    @Mock private AssignmentJpaRepository assignmentJpaRepository;
    @Mock private QuestionJpaRepository questionJpaRepository;
    @Mock private CoursePublicationService coursePublicationService;
    @Mock private VideoAssetPresentationService videoAssetPresentationService;
    @Mock private ObjectMapper objectMapper;
    @Mock private ClassTeacherJpaRepository classTeacherJpaRepository;

    @InjectMocks
    private CourseQueryControllerV3 controller;

    private Course approvedPaidCourse;
    private UUID teacherId;

    @BeforeEach
    void setUp() {
        teacherId = UUID.randomUUID();
        approvedPaidCourse = Course.create(CourseCode.of("LAW-101"), "Course title", "Course description", teacherId);
        approvedPaidCourse.updatePricing(Course.PriceType.PAID, BigDecimal.valueOf(1_500_000), BigDecimal.valueOf(1_200_000));
        approvedPaidCourse.updateDeliveryMode(Course.DeliveryMode.SELF_PACED);
        approvedPaidCourse.updateTags(Set.of("law"));
        approvedPaidCourse.submitForApproval();
        approvedPaidCourse.approve(UUID.randomUUID(), "approved");
    }

    @Test
    @DisplayName("public course list includes pricing, delivery mode and enrollment count")
    void getPublicCoursesIncludesPublicCommerceFields() {
        UserJpaEntity teacher = mock(UserJpaEntity.class);
        when(teacher.getId()).thenReturn(teacherId);
        when(teacher.getFullName()).thenReturn("Teacher Name");

        when(courseRepository.findByStatusAndFilters(eq(Course.CourseStatus.APPROVED), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(approvedPaidCourse)));
        when(userJpaRepository.findAllById(any())).thenReturn(List.of(teacher));
        when(enrollmentJpaRepository.countEnrollmentsByCourseIds(any())).thenReturn(
                java.util.Collections.singletonList(new Object[] {approvedPaidCourse.getId(), 7L})
        );
        when(chapterRepository.countByCourseIds(any())).thenReturn(
                java.util.Collections.singletonList(new Object[] {approvedPaidCourse.getId(), 3L})
        );

        var response = controller.getPublicCourses(0, 20, null, null, null, null, null);

        assertThat(response.getBody()).isNotNull();
        ApiResponse<?> body = response.getBody();
        @SuppressWarnings("unchecked")
        var page = (org.springframework.data.domain.Page<CourseQueryControllerV3.CourseSummaryResponse>) body.getData();
        var item = page.getContent().getFirst();

        assertThat(item.getCode()).isEqualTo("LAW-101");
        assertThat(item.getDeliveryMode()).isEqualTo("SELF_PACED");
        assertThat(item.getPriceType()).isEqualTo("PAID");
        assertThat(item.getPrice()).isEqualByComparingTo(BigDecimal.valueOf(1_500_000));
        assertThat(item.getSalePrice()).isEqualByComparingTo(BigDecimal.valueOf(1_200_000));
        assertThat(item.getEnrolledCount()).isEqualTo(7);
    }

    @Test
    @DisplayName("public course list should use the published thumbnail snapshot")
    void getPublicCoursesUsesPublishedThumbnailSnapshot() {
        approvedPaidCourse.updateThumbnail("https://cdn.example.com/draft-cover.jpg");
        Map<String, Object> publishedDetail = Map.of(
                "thumbnailUrl", "https://cdn.example.com/published-cover.jpg"
        );

        when(courseRepository.findByStatusAndFilters(eq(Course.CourseStatus.APPROVED), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(approvedPaidCourse)));
        when(userJpaRepository.findAllById(any())).thenReturn(List.of());
        when(enrollmentJpaRepository.countEnrollmentsByCourseIds(any())).thenReturn(List.of());
        when(chapterRepository.countByCourseIds(any())).thenReturn(List.of());
        when(coursePublicationService.getPublishedDetails(any(), eq(null)))
                .thenReturn(Map.of(approvedPaidCourse.getId(), publishedDetail));

        var response = controller.getPublicCourses(0, 20, null, null, null, null, null);

        assertThat(response.getBody()).isNotNull();
        @SuppressWarnings("unchecked")
        var page = (org.springframework.data.domain.Page<CourseQueryControllerV3.CourseSummaryResponse>)
                response.getBody().getData();

        assertThat(page.getContent().getFirst().getThumbnailUrl())
                .isEqualTo("https://cdn.example.com/published-cover.jpg");
    }

    @Test
    @DisplayName("course detail includes enrolled count for course detail sidebar")
    void getCourseByIdIncludesEnrolledCount() {
        UserJpaEntity teacher = mock(UserJpaEntity.class);
        when(teacher.getFullName()).thenReturn("Teacher Name");

        when(courseRepository.findByIdWithContent(approvedPaidCourse.getId())).thenReturn(Optional.of(approvedPaidCourse));
        when(userJpaRepository.findById(teacherId)).thenReturn(Optional.of(teacher));
        when(enrollmentJpaRepository.countTotalByCourseIds(List.of(approvedPaidCourse.getId()))).thenReturn(7L);

        var response = controller.getCourseById(approvedPaidCourse.getId());
        var detail = response.getBody().getData();

        assertThat(detail.getTeacherName()).isEqualTo("Teacher Name");
        assertThat(detail.getEnrolledCount()).isEqualTo(7);
        assertThat(detail.getPrice()).isEqualByComparingTo(BigDecimal.valueOf(1_500_000));
        assertThat(detail.getSalePrice()).isEqualByComparingTo(BigDecimal.valueOf(1_200_000));
        assertThat(detail.getDeliveryMode()).isEqualTo("SELF_PACED");
    }

    @Test
    @DisplayName("lesson detail includes section quizData and question summaries for quiz sections")
    void getLessonByIdIncludesSectionQuizData() {
        UUID courseId = approvedPaidCourse.getId();
        UUID chapterId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();

        UserJpaEntity teacher = mock(UserJpaEntity.class);
        when(teacher.getId()).thenReturn(teacherId);
        when(teacher.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);

        LessonJpaEntity lesson = LessonJpaEntity.builder()
                .id(lessonId)
                .chapterId(chapterId)
                .title("Lecture with section quiz")
                .type(LessonJpaEntity.LessonType.LECTURE)
                .contentBlocks(List.of(
                        com.example.lms.shared.domain.model.ContentBlock.of(
                                "section-quiz-1",
                                "QUIZ",
                                Map.of(
                                        "title", "Section quiz",
                                        "isRequired", true,
                                        "quizData", Map.of(
                                                "quizType", "EXAM",
                                                "timeLimitMinutes", 25,
                                                "passingScore", 80,
                                                "maxAttempts", 2,
                                                "shuffleQuestions", false,
                                                "shuffleOptions", true,
                                                "showResultsImmediately", false,
                                                "questionIds", List.of(questionId.toString())
                                        )
                                )
                        )
                ))
                .build();

        ChapterJpaEntity chapter = ChapterJpaEntity.builder()
                .id(chapterId)
                .courseId(courseId)
                .title("Week 1")
                .build();

        QuestionJpaEntity question = QuestionJpaEntity.builder()
                .id(questionId)
                .difficulty(QuestionJpaEntity.Difficulty.MEDIUM)
                .questionType(QuestionJpaEntity.QuestionType.MULTIPLE_CHOICE)
                .contentBlocks(List.of(
                        com.example.lms.shared.domain.model.ContentBlock.of(
                                "question-content-1",
                                "TEXT",
                                Map.of("content", "Question preview from bank")
                        )
                ))
                .build();

        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(chapter));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(approvedPaidCourse));
        when(quizJpaRepository.findByLessonId(lessonId)).thenReturn(List.of());
        when(assignmentJpaRepository.findByLessonId(lessonId)).thenReturn(List.of());
        when(questionJpaRepository.findAllById(List.of(questionId))).thenReturn(List.of(question));

        var response = controller.getLessonById(lessonId, teacher);
        var detail = response.getBody().getData();
        var section = detail.getSections().getFirst();

        assertThat(section.getType()).isEqualTo("QUIZ");
        assertThat(section.getQuizData()).isNotNull();
        assertThat(section.getQuizData().get("quizType")).isEqualTo("EXAM");
        assertThat(section.getQuizData().get("timeLimitMinutes")).isEqualTo(25);
        assertThat(section.getQuizData().get("passingScore")).isEqualTo(80);
        assertThat(section.getQuizData().get("maxAttempts")).isEqualTo(2);
        assertThat(section.getQuizData().get("shuffleQuestions")).isEqualTo(false);
        assertThat(section.getQuizData().get("shuffleOptions")).isEqualTo(true);
        assertThat(section.getQuizData().get("showResultsImmediately")).isEqualTo(false);

        @SuppressWarnings("unchecked")
        var questions = (List<Map<String, Object>>) section.getQuizData().get("questions");
        assertThat(questions).hasSize(1);
        assertThat(questions.getFirst())
                .containsEntry("id", questionId.toString())
                .containsEntry("content", "Question preview from bank")
                .containsEntry("difficulty", "MEDIUM");
    }

    @Test
    @DisplayName("lesson detail extracts question preview text from EditorJS paragraph blocks")
    void getLessonByIdExtractsQuestionPreviewFromEditorJsParagraphBlocks() {
        UUID courseId = approvedPaidCourse.getId();
        UUID chapterId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();

        UserJpaEntity teacher = mock(UserJpaEntity.class);
        when(teacher.getId()).thenReturn(teacherId);
        when(teacher.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);

        LessonJpaEntity lesson = LessonJpaEntity.builder()
                .id(lessonId)
                .chapterId(chapterId)
                .title("Lecture with section quiz")
                .type(LessonJpaEntity.LessonType.LECTURE)
                .contentBlocks(List.of(
                        com.example.lms.shared.domain.model.ContentBlock.of(
                                "section-quiz-1",
                                "QUIZ",
                                Map.of(
                                        "title", "Section quiz",
                                        "quizData", Map.of(
                                                "questionIds", List.of(questionId.toString())
                                        )
                                )
                        )
                ))
                .build();

        ChapterJpaEntity chapter = ChapterJpaEntity.builder()
                .id(chapterId)
                .courseId(courseId)
                .title("Week 1")
                .build();

        QuestionJpaEntity question = QuestionJpaEntity.builder()
                .id(questionId)
                .difficulty(QuestionJpaEntity.Difficulty.MEDIUM)
                .questionType(QuestionJpaEntity.QuestionType.SINGLE_CHOICE)
                .contentBlocks(List.of(
                        com.example.lms.shared.domain.model.ContentBlock.of(
                                "question-content-1",
                                "paragraph",
                                Map.of("text", "Dau la kieu du lieu nguyen thuy trong Java?")
                        )
                ))
                .build();

        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(chapter));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(approvedPaidCourse));
        when(quizJpaRepository.findByLessonId(lessonId)).thenReturn(List.of());
        when(assignmentJpaRepository.findByLessonId(lessonId)).thenReturn(List.of());
        when(questionJpaRepository.findAllById(List.of(questionId))).thenReturn(List.of(question));

        var response = controller.getLessonById(lessonId, teacher);
        var detail = response.getBody().getData();
        var section = detail.getSections().getFirst();

        @SuppressWarnings("unchecked")
        var questions = (List<Map<String, Object>>) section.getQuizData().get("questions");
        assertThat(questions).hasSize(1);
        assertThat(questions.getFirst()).containsEntry("content", "Dau la kieu du lieu nguyen thuy trong Java?");
    }

    @Test
    @DisplayName("lesson detail exposes section streamVideoUid with legacy lesson fallback for single video section")
    void getLessonByIdExposesSectionStreamVideoUidFromLegacyLessonField() {
        UUID courseId = approvedPaidCourse.getId();
        UUID chapterId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();

        UserJpaEntity teacher = mock(UserJpaEntity.class);
        when(teacher.getId()).thenReturn(teacherId);
        when(teacher.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);

        LessonJpaEntity lesson = LessonJpaEntity.builder()
                .id(lessonId)
                .chapterId(chapterId)
                .title("Lecture with internal video")
                .type(LessonJpaEntity.LessonType.LECTURE)
                .streamVideoUid("legacy-stream-uid")
                .contentBlocks(List.of(
                        com.example.lms.shared.domain.model.ContentBlock.of(
                                "section-video-1",
                                "VIDEO",
                                Map.of(
                                        "title", "Bridge simulation video",
                                        "videoUrl", "https://videodelivery.net/legacy-stream-uid/manifest/video.m3u8"
                                )
                        )
                ))
                .build();

        ChapterJpaEntity chapter = ChapterJpaEntity.builder()
                .id(chapterId)
                .courseId(courseId)
                .title("Week 1")
                .build();

        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(chapter));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(approvedPaidCourse));
        when(quizJpaRepository.findByLessonId(lessonId)).thenReturn(List.of());
        when(assignmentJpaRepository.findByLessonId(lessonId)).thenReturn(List.of());

        var response = controller.getLessonById(lessonId, teacher);
        var detail = response.getBody().getData();
        var section = detail.getSections().getFirst();

        assertThat(detail.getStreamVideoUid()).isEqualTo("legacy-stream-uid");
        assertThat(section.getType()).isEqualTo("VIDEO");
        assertThat(section.getStreamVideoUid()).isEqualTo("legacy-stream-uid");
        assertThat(section.getVideoType()).isEqualTo("CLOUDFLARE");
        assertThat(section.getVideoUrl()).isEqualTo("https://videodelivery.net/legacy-stream-uid/manifest/video.m3u8");
    }

    @Test
    @DisplayName("ORG_ADMIN cannot read draft lesson detail for another organization")
    void getLessonByIdRejectsOtherOrgAdminDraftLesson() {
        UUID orgAdminId = UUID.randomUUID();
        UUID orgAdminOrgId = UUID.randomUUID();
        UUID ownerOrgId = UUID.randomUUID();
        UUID chapterId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();

        Course otherOrgDraftCourse = Course.create(
                CourseCode.of("ORG-101"),
                "Other org draft course",
                "Unpublished draft",
                teacherId
        );
        UUID courseId = otherOrgDraftCourse.getId();

        UserJpaEntity orgAdmin = mock(UserJpaEntity.class);
        when(orgAdmin.getId()).thenReturn(orgAdminId);
        when(orgAdmin.getRole()).thenReturn(UserJpaEntity.UserRole.ORG_ADMIN);
        when(orgAdmin.getOrganizationId()).thenReturn(orgAdminOrgId);

        UserJpaEntity owner = mock(UserJpaEntity.class);
        when(owner.getOrganizationId()).thenReturn(ownerOrgId);

        LessonJpaEntity lesson = LessonJpaEntity.builder()
                .id(lessonId)
                .chapterId(chapterId)
                .title("Other org draft lesson")
                .type(LessonJpaEntity.LessonType.LECTURE)
                .contentBlocks(List.of(
                        com.example.lms.shared.domain.model.ContentBlock.of(
                                "text-1",
                                "TEXT",
                                Map.of("content", "Sensitive draft content")
                        )
                ))
                .build();

        ChapterJpaEntity chapter = ChapterJpaEntity.builder()
                .id(chapterId)
                .courseId(courseId)
                .title("Draft chapter")
                .build();

        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(chapter));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(otherOrgDraftCourse));
        when(userJpaRepository.findById(teacherId)).thenReturn(Optional.of(owner));
        when(courseRepository.findByLessonId(lessonId)).thenReturn(Optional.empty());
        when(enrollmentJpaRepository.findByStudentIdAndCourseId(orgAdminId, courseId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.getLessonById(lessonId, orgAdmin))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("published course content hydrates lesson-level video from persisted lesson when publication snapshot is legacy")
    void getCourseContentHydratesLegacyLessonLevelVideo() {
        UUID courseId = approvedPaidCourse.getId();
        UUID chapterId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();

        CourseQueryControllerV3.LessonResponse lesson = CourseQueryControllerV3.LessonResponse.builder()
                .id(lessonId.toString())
                .title("Legacy video lesson")
                .type("LECTURE")
                .lessonType("LECTURE")
                .durationMinutes(12)
                .orderIndex(1)
                .isFree(true)
                .locked(false)
                .sections(List.of())
                .videoUrl(null)
                .streamVideoUid(null)
                .build();

        CourseQueryControllerV3.ChapterResponse chapter = CourseQueryControllerV3.ChapterResponse.builder()
                .id(chapterId.toString())
                .title("Week 1")
                .orderIndex(1)
                .lessons(List.of(lesson))
                .build();

        LessonJpaEntity persistedLesson = LessonJpaEntity.builder()
                .id(lessonId)
                .chapterId(chapterId)
                .title("Legacy video lesson")
                .videoUrl("https://holilihu.online/uploads/videos/legacy-lesson.mp4")
                .build();

        when(coursePublicationService.getPublishedContent(courseId, null))
                .thenReturn(List.of(Map.of("id", chapterId.toString())));
        when(objectMapper.convertValue(any(), eq(CourseQueryControllerV3.ChapterResponse.class)))
                .thenReturn(chapter);
        when(lessonRepository.findAllById(List.of(lessonId))).thenReturn(List.of(persistedLesson));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(approvedPaidCourse));

        var response = controller.getCourseContent(courseId, null);
        var chapters = response.getBody().getData();
        var hydratedLesson = chapters.getFirst().getLessons().getFirst();

        assertThat(hydratedLesson.getVideoUrl()).isEqualTo("https://holilihu.online/uploads/videos/legacy-lesson.mp4");
    }

    @Test
    @DisplayName("section response preserves interactive video spec from published snapshots")
    void sectionResponsePreservesInteractiveVideoSpec() {
        Map<String, Object> interaction = Map.of(
                "id", "iv-1",
                "type", "single_choice",
                "atSeconds", 30,
                "choices", List.of(Map.of(
                        "id", "choice-1",
                        "label", "Continue",
                        "isCorrect", true
                ))
        );
        Map<String, Object> interactiveSpec = Map.of(
                "version", 1,
                "enabled", true,
                "timeline", List.of(interaction)
        );
        CourseQueryControllerV3.SectionResponse section = CourseQueryControllerV3.SectionResponse.builder()
                .id("section-1")
                .title("Interactive video")
                .type("VIDEO")
                .interactiveVideoSpec(interactiveSpec)
                .build();

        assertThat(section.getInteractiveVideoSpec()).isNotNull();
        assertThat(section.getInteractiveVideoSpec()).containsEntry("enabled", true);
        assertThat((List<?>) section.getInteractiveVideoSpec().get("timeline")).hasSize(1);
    }

    @Test
    @DisplayName("published lesson detail falls back to persisted lesson video when publication snapshot predates lesson videoUrl support")
    void getLessonByIdHydratesLegacyPublishedLessonLevelVideo() {
        UUID courseId = approvedPaidCourse.getId();
        UUID chapterId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();

        CourseQueryControllerV3.LessonResponse publishedLesson = CourseQueryControllerV3.LessonResponse.builder()
                .id(lessonId.toString())
                .title("Legacy published video lesson")
                .description("desc")
                .type("LECTURE")
                .lessonType("LECTURE")
                .durationMinutes(15)
                .orderIndex(1)
                .isFree(true)
                .locked(false)
                .sections(List.of(
                        CourseQueryControllerV3.SectionResponse.builder()
                                .id("text-1")
                                .type("TEXT")
                                .content("<p>content</p>")
                                .build()
                ))
                .videoUrl(null)
                .streamVideoUid(null)
                .build();

        CourseQueryControllerV3.ChapterResponse chapter = CourseQueryControllerV3.ChapterResponse.builder()
                .id(chapterId.toString())
                .title("Week 1")
                .orderIndex(1)
                .lessons(List.of(publishedLesson))
                .build();

        LessonJpaEntity persistedLesson = LessonJpaEntity.builder()
                .id(lessonId)
                .chapterId(chapterId)
                .title("Legacy published video lesson")
                .videoUrl("https://holilihu.online/uploads/videos/legacy-published.mp4")
                .build();

        when(courseRepository.findByLessonId(lessonId)).thenReturn(Optional.of(approvedPaidCourse));
        when(coursePublicationService.getPublishedContent(courseId, null))
                .thenReturn(List.of(Map.of("id", chapterId.toString())));
        when(objectMapper.convertValue(any(), eq(CourseQueryControllerV3.ChapterResponse.class)))
                .thenReturn(chapter);
        when(lessonRepository.findAllById(List.of(lessonId))).thenReturn(List.of(persistedLesson));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(approvedPaidCourse));

        var response = controller.getLessonById(lessonId, null);
        var detail = response.getBody().getData();

        assertThat(detail.getVideoUrl()).isEqualTo("https://holilihu.online/uploads/videos/legacy-published.mp4");
    }
}
