package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.port.StudentAssessmentAccessPort;
import com.example.lms.assessment.application.usecase.CreateQuizUseCaseV3;
import com.example.lms.assessment.application.usecase.EvaluateSectionQuizUseCase;
import com.example.lms.assessment.application.usecase.GetQuizStatisticsUseCase;
import com.example.lms.assessment.application.usecase.QuizAttemptUseCase;
import com.example.lms.assessment.application.usecase.QuizManagementUseCase;
import com.example.lms.assessment.domain.model.QuizAttempt;
import com.example.lms.assessment.infrastructure.persistence.entity.QuestionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.QuestionJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizAssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizAttemptJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizJpaRepositoryV3;
import com.example.lms.course_authoring.application.usecase.CreateLessonUseCaseV3;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaLearningClassRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.infrastructure.persistence.entity.PaymentTransactionJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuizControllerV3EmbeddedSectionFlowTest {

    @Mock private CreateQuizUseCaseV3 createQuizUseCase;
    @Mock private QuizManagementUseCase quizManagementUseCase;
    @Mock private QuizAttemptUseCase quizAttemptUseCase;
    @Mock private EvaluateSectionQuizUseCase evaluateSectionQuizUseCase;
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
    @Mock private JpaEnrollmentRepository enrollmentJpaRepository;
    @Mock private StudentAssessmentAccessPort studentAssessmentAccessPort;
    @Mock private PaymentTransactionJpaRepository paymentTransactionJpaRepository;

    @InjectMocks
    private QuizControllerV3 controller;

    private UUID courseId;
    private UUID lessonId;
    private UUID sectionId;
    private UUID questionId;
    private UserJpaEntity student;
    private LessonJpaEntity lesson;
    private CourseJpaEntity course;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();
        lessonId = UUID.randomUUID();
        sectionId = UUID.randomUUID();
        questionId = UUID.randomUUID();

        student = new UserJpaEntity();
        student.setId(UUID.randomUUID());
        student.setRole(UserJpaEntity.UserRole.STUDENT);

        Map<String, Object> quizData = new LinkedHashMap<>();
        quizData.put("timeLimitMinutes", 25);
        quizData.put("maxAttempts", 999);
        quizData.put("passingScore", 60);
        quizData.put("shuffleQuestions", true);
        quizData.put("shuffleOptions", true);
        quizData.put("showResultsImmediately", true);
        quizData.put("showCorrectAnswers", true);
        quizData.put("questionIds", List.of(questionId.toString()));

        Map<String, Object> blockData = new LinkedHashMap<>();
        blockData.put("title", "Section Quiz");
        blockData.put("quizData", quizData);

        lesson = LessonJpaEntity.builder()
                .id(lessonId)
                .chapterId(UUID.randomUUID())
                .title("Lecture with embedded quiz")
                .type(LessonJpaEntity.LessonType.LECTURE)
                .isFree(true)
                .contentBlocks(List.of(ContentBlock.of(sectionId.toString(), "QUIZ", blockData)))
                .build();

        course = CourseJpaEntity.builder()
                .id(courseId)
                .teacherId(UUID.randomUUID())
                .title("Maritime Safety")
                .priceType(CourseJpaEntity.PriceType.PAID)
                .price(java.math.BigDecimal.valueOf(100_000))
                .build();
    }

    @Test
    @DisplayName("getSectionQuiz returns learner-safe embedded quiz payload")
    void getSectionQuizReturnsLearnerSafePayload() {
        course.setPriceType(CourseJpaEntity.PriceType.FREE);
        lesson.setIsFree(false);
        when(lessonJpaRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(courseJpaRepository.findByLessonId(lessonId)).thenReturn(Optional.of(course));
        when(questionJpaRepository.findAllById(List.of(questionId))).thenReturn(List.of(question(questionId)));

        var response = controller.getSectionQuiz(lessonId, sectionId, student);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getData())
                .containsEntry("id", "section:" + sectionId)
                .containsEntry("sectionId", sectionId.toString())
                .containsEntry("lessonId", lessonId.toString())
                .containsEntry("questionCount", 1);
        Object questions = response.getBody().getData().get("questions");
        assertThat(questions).asList().hasSize(1);
    }

    @Test
    @DisplayName("getSectionQuiz allows enrolled student in paid course without payment")
    void getSectionQuizAllowsEnrolledStudentWithoutPayment() {
        lesson.setIsFree(false);
        when(lessonJpaRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(courseJpaRepository.findByLessonId(lessonId)).thenReturn(Optional.of(course));
        when(enrollmentJpaRepository.findByStudentIdAndCourseId(student.getId(), courseId))
                .thenReturn(Optional.of(EnrollmentJpaEntity.builder()
                        .id(UUID.randomUUID())
                        .studentId(student.getId())
                        .status(EnrollmentJpaEntity.EnrollmentStatus.ACTIVE)
                        .build()));
        when(questionJpaRepository.findAllById(List.of(questionId))).thenReturn(List.of(question(questionId)));

        var response = controller.getSectionQuiz(lessonId, sectionId, student);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
    }

    @Test
    @DisplayName("getSectionQuiz rejects unpaid locked content for student")
    void getSectionQuizRejectsLockedPaidContent() {
        lesson.setIsFree(false);
        when(lessonJpaRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(courseJpaRepository.findByLessonId(lessonId)).thenReturn(Optional.of(course));
        when(enrollmentJpaRepository.findByStudentIdAndCourseId(student.getId(), courseId)).thenReturn(Optional.empty());
        when(paymentTransactionJpaRepository.existsByStudentIdAndCourseIdAndStatus(
                student.getId(),
                courseId,
                PaymentTransactionJpaEntity.PaymentStatus.COMPLETED)).thenReturn(false);

        var response = controller.getSectionQuiz(lessonId, sectionId, student);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).contains("đăng ký hoặc thanh toán");
        verify(questionJpaRepository, never()).findAllById(any());
    }

    @Test
    @DisplayName("submitSectionQuiz delegates grading and returns result payload")
    void submitSectionQuizDelegatesGrading() {
        when(lessonJpaRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(courseJpaRepository.findByLessonId(lessonId)).thenReturn(Optional.of(course));
        when(questionJpaRepository.findAllById(List.of(questionId))).thenReturn(List.of(question(questionId)));
        when(evaluateSectionQuizUseCase.execute(any())).thenReturn(
                new EvaluateSectionQuizUseCase.Result(
                        100.0,
                        1,
                        1,
                        true,
                        List.of(Map.of(
                                "questionId", questionId.toString(),
                                "selectedOption", "A",
                                "isCorrect", true,
                                "pointsEarned", 1.0
                        )),
                        null
                )
        );

        List<QuizAttempt.AttemptAnswer> answers = List.of(
                QuizAttempt.AttemptAnswer.builder()
                        .questionId(questionId)
                        .selectedOption("A")
                        .studentAnswer(Map.of("selectedOption", "A"))
                        .build()
        );

        var response = controller.submitSectionQuiz(lessonId, sectionId, answers, student);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getData())
                .containsEntry("quizId", "section:" + sectionId)
                .containsEntry("sectionId", sectionId.toString())
                .containsEntry("status", "SUBMITTED")
                .containsEntry("score", 100.0)
                .containsEntry("correctAnswers", 1)
                .containsEntry("totalQuestions", 1)
                .containsEntry("isPassed", true);
        verify(evaluateSectionQuizUseCase).execute(any());
    }

    private QuestionJpaEntity question(UUID id) {
        return QuestionJpaEntity.builder()
                .id(id)
                .questionType(QuestionJpaEntity.QuestionType.SINGLE_CHOICE)
                .difficulty(QuestionJpaEntity.Difficulty.MEDIUM)
                .status(QuestionJpaEntity.Status.ACTIVE)
                .createdBy(UUID.randomUUID())
                .correctOption("A")
                .contentBlocks(List.of(ContentBlock.of(UUID.randomUUID().toString(), "TEXT", Map.of("text", "Embedded question"))))
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }
}
