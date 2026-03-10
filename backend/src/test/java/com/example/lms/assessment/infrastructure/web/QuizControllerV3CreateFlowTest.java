package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.usecase.CreateQuizUseCaseV3;
import com.example.lms.assessment.application.usecase.GetQuizStatisticsUseCase;
import com.example.lms.assessment.application.usecase.QuizAttemptUseCase;
import com.example.lms.assessment.application.usecase.QuizManagementUseCase;
import com.example.lms.assessment.domain.model.Quiz;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizAssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.QuestionJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizAssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizAttemptJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizJpaRepositoryV3;
import com.example.lms.course_authoring.application.usecase.CreateLessonUseCaseV3;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.ChapterJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaLearningClassRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuizControllerV3CreateFlowTest {

    @Mock private CreateQuizUseCaseV3 createQuizUseCase;
    @Mock private QuizManagementUseCase quizManagementUseCase;
    @Mock private QuizAttemptUseCase quizAttemptUseCase;
    @Mock private GetQuizStatisticsUseCase getQuizStatisticsUseCase;
    @Mock private QuestionJpaRepository questionJpaRepository;
    @Mock private QuizJpaRepositoryV3 quizJpaRepository;
    @Mock private QuizAttemptJpaRepository attemptJpaRepository;
    @Mock private JpaCourseRepository courseJpaRepository;
    @Mock private CreateLessonUseCaseV3 createLessonUseCase;
    @Mock private ChapterJpaRepository chapterJpaRepository;
    @Mock private LessonJpaRepository lessonJpaRepository;
    @Mock private QuizAssignmentJpaRepository quizAssignmentJpaRepository;
    @Mock private JpaLearningClassRepository classJpaRepository;

    @InjectMocks
    private QuizControllerV3 controller;

    private UUID teacherId;
    private UUID courseId;
    private UUID chapterId;
    private UUID lessonId;
    private UUID quizId;
    private UserJpaEntity owner;
    private CourseJpaEntity ownedCourse;

    @BeforeEach
    void setUp() {
        teacherId = UUID.randomUUID();
        courseId = UUID.randomUUID();
        chapterId = UUID.randomUUID();
        lessonId = UUID.randomUUID();
        quizId = UUID.randomUUID();

        owner = new UserJpaEntity();
        owner.setId(teacherId);
        owner.setRole(UserJpaEntity.UserRole.TEACHER);

        ownedCourse = CourseJpaEntity.builder()
                .id(courseId)
                .teacherId(teacherId)
                .title("Navigation")
                .deliveryMode(CourseJpaEntity.DeliveryMode.INSTRUCTOR_LED)
                .build();
    }

    @Test
    @DisplayName("createQuiz: enforce lesson ownership and quiz lesson type on generic endpoint")
    void createQuizGenericEndpointValidatesLessonContext() {
        var command = new CreateQuizUseCaseV3.CreateQuizCommand(
                lessonId,
                "Weekly Quiz",
                "Quiz description",
                30,
                70,
                true,
                true
        );
        when(courseJpaRepository.findByLessonId(lessonId)).thenReturn(Optional.of(ownedCourse));
        when(lessonJpaRepository.findById(lessonId)).thenReturn(Optional.of(
                LessonJpaEntity.builder().id(lessonId).chapterId(chapterId).title("Lecture 1").type(LessonJpaEntity.LessonType.LECTURE).build()
        ));

        var response = controller.createQuiz(command, owner);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).contains("Chi co the khoi tao quiz cho lesson loai QUIZ");
        verify(createQuizUseCase, never()).execute(any());
    }

    @Test
    @DisplayName("createLessonQuiz: reject lesson that is not QUIZ type")
    void createLessonQuizRejectsNonQuizLesson() {
        when(courseJpaRepository.findByLessonId(lessonId)).thenReturn(Optional.of(ownedCourse));
        when(lessonJpaRepository.findById(lessonId)).thenReturn(Optional.of(
                LessonJpaEntity.builder().id(lessonId).chapterId(chapterId).title("Lecture 1").type(LessonJpaEntity.LessonType.LECTURE).build()
        ));

        var response = controller.createLessonQuiz(lessonId, request(null, null), owner);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).contains("Chi co the khoi tao quiz cho lesson loai QUIZ");
        verify(createQuizUseCase, never()).execute(any());
    }

    @Test
    @DisplayName("createCourseQuiz: reject chapter that does not belong to the selected course")
    void createCourseQuizRejectsForeignChapter() {
        UUID foreignCourseId = UUID.randomUUID();
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(ownedCourse));
        when(chapterJpaRepository.findById(chapterId)).thenReturn(Optional.of(
                ChapterJpaEntity.builder().id(chapterId).courseId(foreignCourseId).title("Week 1").build()
        ));

        var response = controller.createCourseQuiz(courseId, request(chapterId, null), owner);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).contains("Chương");
        verify(createLessonUseCase, never()).execute(any());
    }

    @Test
    @DisplayName("createCourseQuiz: reject class that does not belong to the selected course")
    void createCourseQuizRejectsForeignClass() {
        UUID classId = UUID.randomUUID();
        UUID foreignCourseId = UUID.randomUUID();

        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(ownedCourse));
        when(chapterJpaRepository.findById(chapterId)).thenReturn(Optional.of(
                ChapterJpaEntity.builder().id(chapterId).courseId(courseId).title("Week 1").build()
        ));
        when(classJpaRepository.findById(classId)).thenReturn(Optional.of(
                LearningClassJpaEntity.builder().id(classId).courseId(foreignCourseId).name("CLS").build()
        ));

        var response = controller.createCourseQuiz(courseId, request(chapterId, classId), owner);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).contains("Lớp học");
        verify(quizAssignmentJpaRepository, never()).save(any());
    }

    @Test
    @DisplayName("createCourseQuiz: persist course/class assignment after creating quiz lesson")
    void createCourseQuizPersistsAssignment() {
        UUID classId = UUID.randomUUID();
        var createdQuiz = Quiz.create(lessonId, "Weekly Quiz", "Desc", Quiz.QuizSettings.defaults());

        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(ownedCourse));
        when(chapterJpaRepository.findById(chapterId)).thenReturn(Optional.of(
                ChapterJpaEntity.builder().id(chapterId).courseId(courseId).title("Week 1").build()
        ));
        when(classJpaRepository.findById(classId)).thenReturn(Optional.of(
                LearningClassJpaEntity.builder().id(classId).courseId(courseId).name("CLS").build()
        ));
        when(createLessonUseCase.execute(any())).thenReturn(lessonId);
        when(createQuizUseCase.execute(any())).thenReturn(quizId);
        when(quizManagementUseCase.getQuizById(quizId)).thenReturn(createdQuiz);

        var response = controller.createCourseQuiz(courseId, request(chapterId, classId), owner);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getData()).containsEntry("courseId", courseId.toString());
        assertThat(response.getBody().getData()).containsEntry("classId", classId.toString());
        assertThat(response.getBody().getData()).containsEntry("lessonId", lessonId.toString());

        ArgumentCaptor<QuizAssignmentJpaEntity> captor = ArgumentCaptor.forClass(QuizAssignmentJpaEntity.class);
        verify(quizAssignmentJpaRepository).save(captor.capture());
        assertThat(captor.getValue().getQuizId()).isEqualTo(quizId);
        assertThat(captor.getValue().getCourseId()).isEqualTo(courseId);
        assertThat(captor.getValue().getClassId()).isEqualTo(classId);
        verify(quizManagementUseCase).addQuestionToQuiz(eq(quizId), any(UUID.class), eq(0), eq(teacherId), eq("TEACHER"));
        verify(quizManagementUseCase).publishQuiz(quizId, teacherId, "TEACHER");
    }

    @Test
    @DisplayName("createChapterQuiz: create quiz lesson inside the requested chapter")
    void createChapterQuizCreatesLessonInChapter() {
        var createdQuiz = Quiz.create(lessonId, "Weekly Quiz", "Desc", Quiz.QuizSettings.defaults());

        when(courseJpaRepository.findByChapterId(chapterId)).thenReturn(Optional.of(ownedCourse));
        when(createLessonUseCase.execute(any())).thenReturn(lessonId);
        when(createQuizUseCase.execute(any())).thenReturn(quizId);
        when(quizManagementUseCase.getQuizById(quizId)).thenReturn(createdQuiz);

        var response = controller.createChapterQuiz(chapterId, request(null, null), owner);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(createLessonUseCase).execute(eq(new CreateLessonUseCaseV3.CreateLessonCommand(
                chapterId,
                "Weekly Quiz",
                "Quiz description",
                "QUIZ",
                null,
                0,
                null,
                Boolean.FALSE
        )));
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData()).containsEntry("lessonId", lessonId.toString());
    }

    @Test
    @DisplayName("createChapterQuiz: allow draft quiz initialization without questions")
    void createChapterQuizAllowsEmptyQuestionDraft() {
        var createdQuiz = Quiz.create(lessonId, "Draft Quiz", "Desc", Quiz.QuizSettings.defaults());

        when(courseJpaRepository.findByChapterId(chapterId)).thenReturn(Optional.of(ownedCourse));
        when(createLessonUseCase.execute(any())).thenReturn(lessonId);
        when(createQuizUseCase.execute(any())).thenReturn(quizId);
        when(quizManagementUseCase.getQuizById(quizId)).thenReturn(createdQuiz);

        var response = controller.createChapterQuiz(chapterId, request(chapterId, null, List.of(), false), owner);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(quizManagementUseCase, never()).addQuestionToQuiz(eq(quizId), any(UUID.class), eq(0), eq(teacherId), eq("TEACHER"));
        verify(quizManagementUseCase, never()).publishQuiz(any(UUID.class), any(UUID.class), any(String.class));
    }

    @Test
    @DisplayName("createSectionQuiz: keep legacy alias for chapter-anchored creation")
    void createSectionQuizLegacyAliasDelegatesToChapterFlow() {
        var createdQuiz = Quiz.create(lessonId, "Weekly Quiz", "Desc", Quiz.QuizSettings.defaults());

        when(courseJpaRepository.findByChapterId(chapterId)).thenReturn(Optional.of(ownedCourse));
        when(createLessonUseCase.execute(any())).thenReturn(lessonId);
        when(createQuizUseCase.execute(any())).thenReturn(quizId);
        when(quizManagementUseCase.getQuizById(quizId)).thenReturn(createdQuiz);

        var response = controller.createSectionQuiz(chapterId, request(null, null), owner);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData()).containsEntry("lessonId", lessonId.toString());
    }

    @Test
    @DisplayName("getQuizQuestionsByLesson: resolve lesson quiz before loading questions")
    void getQuizQuestionsByLessonResolvesLessonQuiz() {
        var quizEntity = QuizJpaEntity.builder()
                .id(quizId)
                .lessonId(lessonId)
                .createdAt(Instant.parse("2026-03-01T00:00:00Z"))
                .build();
        var createdQuiz = Quiz.create(lessonId, "Weekly Quiz", "Desc", Quiz.QuizSettings.defaults());

        when(quizJpaRepository.findByLessonId(lessonId)).thenReturn(List.of(quizEntity));
        when(quizManagementUseCase.getQuizById(quizId)).thenReturn(createdQuiz);
        when(courseJpaRepository.findByLessonId(lessonId)).thenReturn(Optional.of(ownedCourse));

        var response = controller.getQuizQuestionsByLesson(lessonId, owner);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        verify(quizManagementUseCase).getQuizById(quizId);
    }

    private QuizControllerV3.StructuredQuizRequest request(UUID selectedChapterId, UUID classId) {
        return request(selectedChapterId, classId, List.of(UUID.randomUUID()), true);
    }

    private QuizControllerV3.StructuredQuizRequest request(
            UUID selectedChapterId,
            UUID classId,
            List<UUID> questionIds,
            boolean publishImmediately
    ) {
        return new QuizControllerV3.StructuredQuizRequest(
                "Weekly Quiz",
                "Quiz description",
                30,
                2,
                70,
                true,
                false,
                true,
                false,
                "2026-03-01T00:00:00Z",
                "2026-03-08T00:00:00Z",
                selectedChapterId,
                classId,
                questionIds,
                publishImmediately
        );
    }
}
