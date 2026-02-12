package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.*;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.assessment.domain.repository.QuizAttemptRepository;
import com.example.lms.assessment.domain.repository.QuizRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for QuizAttemptUseCase - grading flow, batch fetch, strategy dispatch.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("QuizAttemptUseCase Tests")
class QuizAttemptUseCaseTest {

    @Mock
    private QuizRepository quizRepository;

    @Mock
    private QuizAttemptRepository attemptRepository;

    @Mock
    private QuestionRepository questionRepository;

    @InjectMocks
    private QuizAttemptUseCase useCase;

    private UUID quizId;
    private UUID studentId;
    private UUID attemptId;
    private UUID q1Id, q2Id, q3Id;

    @BeforeEach
    void setUp() {
        quizId = UUID.randomUUID();
        studentId = UUID.randomUUID();
        attemptId = UUID.randomUUID();
        q1Id = UUID.randomUUID();
        q2Id = UUID.randomUUID();
        q3Id = UUID.randomUUID();
    }

    // ============================================================
    // Helpers
    // ============================================================

    private Quiz buildPublishedQuiz(List<QuizQuestion> questions, int passingScore) {
        return Quiz.builder()
                .id(QuizId.of(quizId))
                .lessonId(UUID.randomUUID())
                .title("Test Quiz")
                .settings(Quiz.QuizSettings.builder()
                        .passingScore(passingScore)
                        .maxAttempts(3)
                        .build())
                .status(Quiz.QuizStatus.PUBLISHED)
                .questions(questions)
                .build();
    }

    private QuizAttempt buildInProgressAttempt(List<UUID> questionIds) {
        return QuizAttempt.builder()
                .id(attemptId)
                .quizId(quizId)
                .studentId(studentId)
                .status(QuizAttempt.AttemptStatus.IN_PROGRESS)
                .items(new ArrayList<>())
                .build();
    }

    private Question buildSingleChoiceQuestion(UUID id, String correctOption) {
        return Question.builder()
                .id(id)
                .questionType(Question.QuestionType.SINGLE_CHOICE)
                .answerKey(Map.of("correctOption", correctOption))
                .status(Question.Status.ACTIVE)
                .build();
    }

    // ============================================================
    // startAttempt Tests
    // ============================================================
    @Nested
    @DisplayName("Start Attempt")
    class StartAttemptTests {

        @Test
        @DisplayName("Should start attempt for published quiz")
        void shouldStartAttempt() {
            Quiz quiz = buildPublishedQuiz(
                    List.of(QuizQuestion.create(quizId, q1Id, 0)), 70);

            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(attemptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            QuizAttempt attempt = useCase.startAttempt(quizId, studentId);

            assertThat(attempt).isNotNull();
            assertThat(attempt.getQuizId()).isEqualTo(quizId);
            assertThat(attempt.getStudentId()).isEqualTo(studentId);
            assertThat(attempt.getStatus()).isEqualTo(QuizAttempt.AttemptStatus.IN_PROGRESS);
            verify(attemptRepository).save(any());
        }

        @Test
        @DisplayName("Should shuffle question order when shuffleQuestions=true")
        void shouldShuffleQuestionsWhenEnabled() {
            // Setup quiz with 5 questions and shuffleQuestions=true
            UUID q4Id = UUID.randomUUID();
            UUID q5Id = UUID.randomUUID();
            List<QuizQuestion> quizQuestions = List.of(
                    QuizQuestion.create(quizId, q1Id, 0),
                    QuizQuestion.create(quizId, q2Id, 1),
                    QuizQuestion.create(quizId, q3Id, 2),
                    QuizQuestion.create(quizId, q4Id, 3),
                    QuizQuestion.create(quizId, q5Id, 4));
            Quiz quiz = Quiz.builder()
                    .id(QuizId.of(quizId))
                    .lessonId(UUID.randomUUID())
                    .title("Shuffle Quiz")
                    .settings(Quiz.QuizSettings.builder()
                            .shuffleQuestions(true)
                            .passingScore(70)
                            .maxAttempts(100)
                            .build())
                    .status(Quiz.QuizStatus.PUBLISHED)
                    .questions(quizQuestions)
                    .build();

            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(attemptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            // Run many attempts — at least one should differ from original order
            List<UUID> originalOrder = List.of(q1Id, q2Id, q3Id, q4Id, q5Id);
            boolean foundDifferentOrder = false;
            for (int i = 0; i < 20; i++) {
                QuizAttempt attempt = useCase.startAttempt(quizId, studentId);
                List<UUID> attemptOrder = attempt.getItems().stream()
                        .map(QuizAttempt.AttemptItem::getQuestionId)
                        .toList();
                // All question IDs should be present
                assertThat(attemptOrder).containsExactlyInAnyOrder(
                        q1Id, q2Id, q3Id, q4Id, q5Id);
                if (!attemptOrder.equals(originalOrder)) {
                    foundDifferentOrder = true;
                    break;
                }
            }
            assertThat(foundDifferentOrder)
                    .as("After 20 attempts with 5 questions, at least one should be shuffled (p=1-(1/120)^20 ≈ 1)")
                    .isTrue();
        }

        @Test
        @DisplayName("Should NOT shuffle when shuffleQuestions=false")
        void shouldNotShuffleWhenDisabled() {
            List<QuizQuestion> quizQuestions = List.of(
                    QuizQuestion.create(quizId, q1Id, 0),
                    QuizQuestion.create(quizId, q2Id, 1),
                    QuizQuestion.create(quizId, q3Id, 2));
            Quiz quiz = Quiz.builder()
                    .id(QuizId.of(quizId))
                    .lessonId(UUID.randomUUID())
                    .title("No Shuffle Quiz")
                    .settings(Quiz.QuizSettings.builder()
                            .shuffleQuestions(false)
                            .passingScore(70)
                            .maxAttempts(100)
                            .build())
                    .status(Quiz.QuizStatus.PUBLISHED)
                    .questions(quizQuestions)
                    .build();

            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(attemptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            // All attempts should have same order
            List<UUID> expectedOrder = List.of(q1Id, q2Id, q3Id);
            for (int i = 0; i < 5; i++) {
                QuizAttempt attempt = useCase.startAttempt(quizId, studentId);
                List<UUID> attemptOrder = attempt.getItems().stream()
                        .map(QuizAttempt.AttemptItem::getQuestionId)
                        .toList();
                assertThat(attemptOrder).isEqualTo(expectedOrder);
            }
        }

        @Test
        @DisplayName("Should throw when quiz not found")
        void shouldThrowWhenQuizNotFound() {
            when(quizRepository.findById(any())).thenReturn(Optional.empty());

            assertThatThrownBy(() -> useCase.startAttempt(quizId, studentId))
                    .isInstanceOf(EntityNotFoundException.class);
        }

        @Test
        @DisplayName("Should throw when quiz not published")
        void shouldThrowWhenNotPublished() {
            Quiz quiz = Quiz.builder()
                    .id(QuizId.of(quizId))
                    .lessonId(UUID.randomUUID())
                    .title("Draft Quiz")
                    .settings(Quiz.QuizSettings.defaults())
                    .status(Quiz.QuizStatus.DRAFT)
                    .questions(List.of())
                    .build();

            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));

            assertThatThrownBy(() -> useCase.startAttempt(quizId, studentId))
                    .isInstanceOf(BusinessRuleException.class);
        }
    }

    // ============================================================
    // submitAttempt Tests
    // ============================================================
    @Nested
    @DisplayName("Submit Attempt - Grading Flow")
    class SubmitAttemptTests {

        @Test
        @DisplayName("Should grade all correct answers → 100% → passed")
        void shouldGradeAllCorrect() {
            // Setup quiz with 2 questions, passing score 70%
            List<QuizQuestion> quizQuestions = List.of(
                    QuizQuestion.create(quizId, q1Id, 0),
                    QuizQuestion.create(quizId, q2Id, 1));
            Quiz quiz = buildPublishedQuiz(quizQuestions, 70);

            QuizAttempt attempt = buildInProgressAttempt(List.of(q1Id, q2Id));

            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(questionRepository.findAllByIds(any())).thenReturn(List.of(
                    buildSingleChoiceQuestion(q1Id, "A"),
                    buildSingleChoiceQuestion(q2Id, "B")));
            when(attemptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            List<QuizAttempt.AttemptAnswer> answers = List.of(
                    QuizAttempt.AttemptAnswer.builder()
                            .questionId(q1Id)
                            .studentAnswer(Map.of("selectedOption", "A"))
                            .build(),
                    QuizAttempt.AttemptAnswer.builder()
                            .questionId(q2Id)
                            .studentAnswer(Map.of("selectedOption", "B"))
                            .build());

            QuizAttempt result = useCase.submitAttempt(attemptId, answers);

            assertThat(result.getStatus()).isEqualTo(QuizAttempt.AttemptStatus.SUBMITTED);
            assertThat(result.getScore()).isCloseTo(100.0, within(0.1));
            assertThat(result.getIsPassed()).isTrue();
            assertThat(result.getItems()).hasSize(2);
            verify(questionRepository).findAllByIds(any()); // batch fetch
        }

        @Test
        @DisplayName("Should grade partial correct → 50% → failed (passing=70)")
        void shouldGradePartialCorrect() {
            List<QuizQuestion> quizQuestions = List.of(
                    QuizQuestion.create(quizId, q1Id, 0),
                    QuizQuestion.create(quizId, q2Id, 1));
            Quiz quiz = buildPublishedQuiz(quizQuestions, 70);

            QuizAttempt attempt = buildInProgressAttempt(List.of(q1Id, q2Id));

            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(questionRepository.findAllByIds(any())).thenReturn(List.of(
                    buildSingleChoiceQuestion(q1Id, "A"),
                    buildSingleChoiceQuestion(q2Id, "B")));
            when(attemptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            List<QuizAttempt.AttemptAnswer> answers = List.of(
                    QuizAttempt.AttemptAnswer.builder()
                            .questionId(q1Id)
                            .studentAnswer(Map.of("selectedOption", "A")) // correct
                            .build(),
                    QuizAttempt.AttemptAnswer.builder()
                            .questionId(q2Id)
                            .studentAnswer(Map.of("selectedOption", "C")) // wrong
                            .build());

            QuizAttempt result = useCase.submitAttempt(attemptId, answers);

            assertThat(result.getScore()).isCloseTo(50.0, within(0.1));
            assertThat(result.getIsPassed()).isFalse();
        }

        @Test
        @DisplayName("Should handle essay questions → not auto-passed")
        void shouldHandleEssayQuestions() {
            List<QuizQuestion> quizQuestions = List.of(
                    QuizQuestion.create(quizId, q1Id, 0));
            Quiz quiz = buildPublishedQuiz(quizQuestions, 70);

            Question essayQ = Question.builder()
                    .id(q1Id)
                    .questionType(Question.QuestionType.ESSAY)
                    .status(Question.Status.ACTIVE)
                    .build();

            QuizAttempt attempt = buildInProgressAttempt(List.of(q1Id));

            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(questionRepository.findAllByIds(any())).thenReturn(List.of(essayQ));
            when(attemptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            List<QuizAttempt.AttemptAnswer> answers = List.of(
                    QuizAttempt.AttemptAnswer.builder()
                            .questionId(q1Id)
                            .studentAnswer(Map.of("textAnswer", "My essay content"))
                            .build());

            QuizAttempt result = useCase.submitAttempt(attemptId, answers);

            // Essay cannot auto-pass
            assertThat(result.getIsPassed()).isFalse();
        }

        @Test
        @DisplayName("Should use points override from QuizQuestion")
        void shouldUsePointsOverride() {
            // QuizQuestion with points=5 instead of default 1
            QuizQuestion qq = QuizQuestion.builder()
                    .quizId(quizId)
                    .questionId(q1Id)
                    .displayOrder(0)
                    .points(5)
                    .build();
            Quiz quiz = buildPublishedQuiz(List.of(qq), 70);

            QuizAttempt attempt = buildInProgressAttempt(List.of(q1Id));

            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(questionRepository.findAllByIds(any())).thenReturn(
                    List.of(buildSingleChoiceQuestion(q1Id, "A")));
            when(attemptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            List<QuizAttempt.AttemptAnswer> answers = List.of(
                    QuizAttempt.AttemptAnswer.builder()
                            .questionId(q1Id)
                            .studentAnswer(Map.of("selectedOption", "A"))
                            .build());

            QuizAttempt result = useCase.submitAttempt(attemptId, answers);

            // Should be 100% (5/5 points)
            assertThat(result.getScore()).isCloseTo(100.0, within(0.1));
            // Verify the item has 5 points earned
            assertThat(result.getItems().get(0).getPointsEarned()).isCloseTo(5.0, within(0.01));
        }

        @Test
        @DisplayName("Should throw when attempt not found")
        void shouldThrowWhenAttemptNotFound() {
            when(attemptRepository.findById(attemptId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> useCase.submitAttempt(attemptId, List.of()))
                    .isInstanceOf(EntityNotFoundException.class);
        }

        @Test
        @DisplayName("Should throw when attempt already submitted")
        void shouldThrowWhenAlreadySubmitted() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .id(attemptId)
                    .quizId(quizId)
                    .studentId(studentId)
                    .status(QuizAttempt.AttemptStatus.SUBMITTED)
                    .items(new ArrayList<>())
                    .build();

            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));

            assertThatThrownBy(() -> useCase.submitAttempt(attemptId, List.of()))
                    .isInstanceOf(IllegalStateException.class);
        }

        @Test
        @DisplayName("Should use legacy selectedOption via getEffectiveAnswer()")
        void shouldUseLegacySelectedOption() {
            List<QuizQuestion> quizQuestions = List.of(
                    QuizQuestion.create(quizId, q1Id, 0));
            Quiz quiz = buildPublishedQuiz(quizQuestions, 70);

            QuizAttempt attempt = buildInProgressAttempt(List.of(q1Id));

            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(questionRepository.findAllByIds(any())).thenReturn(
                    List.of(buildSingleChoiceQuestion(q1Id, "A")));
            when(attemptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            // Legacy format: only selectedOption, no studentAnswer
            List<QuizAttempt.AttemptAnswer> answers = List.of(
                    QuizAttempt.AttemptAnswer.builder()
                            .questionId(q1Id)
                            .selectedOption("A")
                            .build());

            QuizAttempt result = useCase.submitAttempt(attemptId, answers);

            assertThat(result.getScore()).isCloseTo(100.0, within(0.1));
            assertThat(result.getIsPassed()).isTrue();
        }

        @Test
        @DisplayName("Should skip unknown questions gracefully")
        void shouldSkipUnknownQuestions() {
            List<QuizQuestion> quizQuestions = List.of(
                    QuizQuestion.create(quizId, q1Id, 0));
            Quiz quiz = buildPublishedQuiz(quizQuestions, 70);

            QuizAttempt attempt = buildInProgressAttempt(List.of(q1Id));

            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            // Return empty - question not found
            when(questionRepository.findAllByIds(any())).thenReturn(List.of());
            when(attemptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            List<QuizAttempt.AttemptAnswer> answers = List.of(
                    QuizAttempt.AttemptAnswer.builder()
                            .questionId(q1Id)
                            .studentAnswer(Map.of("selectedOption", "A"))
                            .build());

            // Should not throw, just skip unknown questions
            QuizAttempt result = useCase.submitAttempt(attemptId, answers);

            assertThat(result.getStatus()).isEqualTo(QuizAttempt.AttemptStatus.SUBMITTED);
        }

        @Test
        @DisplayName("Should use default passingScore 60 when null")
        void shouldUseDefaultPassingScore() {
            List<QuizQuestion> quizQuestions = List.of(
                    QuizQuestion.create(quizId, q1Id, 0));
            // passingScore = null
            Quiz quiz = Quiz.builder()
                    .id(QuizId.of(quizId))
                    .lessonId(UUID.randomUUID())
                    .title("Quiz")
                    .settings(Quiz.QuizSettings.builder().build()) // all null
                    .status(Quiz.QuizStatus.PUBLISHED)
                    .questions(quizQuestions)
                    .build();

            QuizAttempt attempt = buildInProgressAttempt(List.of(q1Id));

            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(questionRepository.findAllByIds(any())).thenReturn(
                    List.of(buildSingleChoiceQuestion(q1Id, "A")));
            when(attemptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            List<QuizAttempt.AttemptAnswer> answers = List.of(
                    QuizAttempt.AttemptAnswer.builder()
                            .questionId(q1Id)
                            .studentAnswer(Map.of("selectedOption", "A"))
                            .build());

            QuizAttempt result = useCase.submitAttempt(attemptId, answers);

            // 100% >= 60% default → passed
            assertThat(result.getIsPassed()).isTrue();
        }

        @Test
        @DisplayName("Should mark attempt as TIMEOUT when time limit exceeded")
        void shouldMarkTimeoutWhenTimeLimitExceeded() {
            // Quiz with 1-minute time limit
            List<QuizQuestion> quizQuestions = List.of(
                    QuizQuestion.create(quizId, q1Id, 0));
            Quiz quiz = Quiz.builder()
                    .id(QuizId.of(quizId))
                    .lessonId(UUID.randomUUID())
                    .title("Timed Quiz")
                    .settings(Quiz.QuizSettings.builder()
                            .timeLimitMinutes(1) // 1 minute
                            .passingScore(70)
                            .build())
                    .status(Quiz.QuizStatus.PUBLISHED)
                    .questions(quizQuestions)
                    .build();

            // Attempt started 5 minutes ago (well past 1 min + 60s grace)
            QuizAttempt attempt = QuizAttempt.builder()
                    .id(attemptId)
                    .quizId(quizId)
                    .studentId(studentId)
                    .startTime(Instant.now().minusSeconds(300)) // 5 minutes ago
                    .status(QuizAttempt.AttemptStatus.IN_PROGRESS)
                    .items(new ArrayList<>())
                    .build();

            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(questionRepository.findAllByIds(any())).thenReturn(
                    List.of(buildSingleChoiceQuestion(q1Id, "A")));
            when(attemptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            List<QuizAttempt.AttemptAnswer> answers = List.of(
                    QuizAttempt.AttemptAnswer.builder()
                            .questionId(q1Id)
                            .studentAnswer(Map.of("selectedOption", "A"))
                            .build());

            QuizAttempt result = useCase.submitAttempt(attemptId, answers);

            // Should be marked as TIMEOUT but still graded
            assertThat(result.getStatus()).isEqualTo(QuizAttempt.AttemptStatus.TIMEOUT);
            assertThat(result.getScore()).isNotNull(); // Still gets graded
        }
    }
}
