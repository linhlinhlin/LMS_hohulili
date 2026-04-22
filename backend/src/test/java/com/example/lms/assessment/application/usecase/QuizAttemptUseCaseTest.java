package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.port.StudentAssessmentAccessPort;
import com.example.lms.assessment.domain.event.QuizSubmittedEvent;
import com.example.lms.assessment.domain.model.*;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.assessment.domain.repository.QuizAttemptRepository;
import com.example.lms.assessment.domain.repository.QuizRepository;
import com.example.lms.shared.domain.event.DomainEventPublisher;
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
 * Unit tests for QuizAttemptUseCase - grading flow, batch fetch, strategy dispatch,
 * manual grading, availability window, auto-save.
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

    @Mock
    private DomainEventPublisher eventPublisher;

    @Mock
    private StudentAssessmentAccessPort studentAssessmentAccessPort;

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
        lenient().when(studentAssessmentAccessPort.canAccessQuiz(quizId, studentId)).thenReturn(true);
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

        @Test
        @DisplayName("Should throw when student cannot access quiz distribution")
        void shouldThrowWhenStudentCannotAccessQuizDistribution() {
            Quiz quiz = buildPublishedQuiz(List.of(QuizQuestion.create(quizId, q1Id, 0)), 70);
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(studentAssessmentAccessPort.canAccessQuiz(quizId, studentId)).thenReturn(false);

            assertThatThrownBy(() -> useCase.startAttempt(quizId, studentId))
                    .isInstanceOf(BusinessRuleException.class)
                    .satisfies(ex -> assertThat(((BusinessRuleException) ex).getRuleName())
                            .isEqualTo("QUIZ_ACCESS_DENIED"));
        }

        @Test
        @DisplayName("Should throw MAX_ATTEMPTS_REACHED when student has used all attempts")
        void shouldThrowWhenMaxAttemptsReached() {
            Quiz quiz = Quiz.builder()
                    .id(QuizId.of(quizId))
                    .lessonId(UUID.randomUUID())
                    .title("Limited Quiz")
                    .settings(Quiz.QuizSettings.builder()
                            .passingScore(70)
                            .maxAttempts(2) // Only 2 attempts allowed
                            .build())
                    .status(Quiz.QuizStatus.PUBLISHED)
                    .questions(List.of(QuizQuestion.create(quizId, q1Id, 0)))
                    .build();

            // Student already has 2 previous attempts
            QuizAttempt prev1 = QuizAttempt.builder().id(UUID.randomUUID()).quizId(quizId)
                    .studentId(studentId).status(QuizAttempt.AttemptStatus.SUBMITTED).items(List.of()).build();
            QuizAttempt prev2 = QuizAttempt.builder().id(UUID.randomUUID()).quizId(quizId)
                    .studentId(studentId).status(QuizAttempt.AttemptStatus.SUBMITTED).items(List.of()).build();

            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(attemptRepository.countCompletedByQuizIdAndStudentId(quizId, studentId))
                    .thenReturn(2L);

            assertThatThrownBy(() -> useCase.startAttempt(quizId, studentId))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("hết")
                    .hasMessageContaining("2");
        }

        // Phase 6: Availability window tests
        @Test
        @DisplayName("Should throw QUIZ_NOT_YET_AVAILABLE when before availableFrom")
        void shouldThrowWhenBeforeAvailableFrom() {
            Quiz quiz = Quiz.builder()
                    .id(QuizId.of(quizId))
                    .lessonId(UUID.randomUUID())
                    .title("Future Quiz")
                    .settings(Quiz.QuizSettings.builder()
                            .passingScore(70)
                            .maxAttempts(3)
                            .availableFrom(Instant.now().plusSeconds(3600)) // 1 hour in future
                            .build())
                    .status(Quiz.QuizStatus.PUBLISHED)
                    .questions(List.of(QuizQuestion.create(quizId, q1Id, 0)))
                    .build();

            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));

            assertThatThrownBy(() -> useCase.startAttempt(quizId, studentId))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("chưa mở");
        }

        @Test
        @DisplayName("Should throw QUIZ_LOCKED when after lockAt")
        void shouldThrowWhenAfterLockAt() {
            Quiz quiz = Quiz.builder()
                    .id(QuizId.of(quizId))
                    .lessonId(UUID.randomUUID())
                    .title("Locked Quiz")
                    .settings(Quiz.QuizSettings.builder()
                            .passingScore(70)
                            .maxAttempts(3)
                            .lockAt(Instant.now().minusSeconds(3600)) // 1 hour in past
                            .build())
                    .status(Quiz.QuizStatus.PUBLISHED)
                    .questions(List.of(QuizQuestion.create(quizId, q1Id, 0)))
                    .build();

            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));

            assertThatThrownBy(() -> useCase.startAttempt(quizId, studentId))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("đã đóng");
        }

        @Test
        @DisplayName("Should allow attempt when within availability window")
        void shouldAllowWhenWithinWindow() {
            Quiz quiz = Quiz.builder()
                    .id(QuizId.of(quizId))
                    .lessonId(UUID.randomUUID())
                    .title("Open Quiz")
                    .settings(Quiz.QuizSettings.builder()
                            .passingScore(70)
                            .maxAttempts(3)
                            .availableFrom(Instant.now().minusSeconds(3600)) // 1 hour ago
                            .lockAt(Instant.now().plusSeconds(3600)) // 1 hour from now
                            .build())
                    .status(Quiz.QuizStatus.PUBLISHED)
                    .questions(List.of(QuizQuestion.create(quizId, q1Id, 0)))
                    .build();

            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(attemptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            QuizAttempt attempt = useCase.startAttempt(quizId, studentId);
            assertThat(attempt.getStatus()).isEqualTo(QuizAttempt.AttemptStatus.IN_PROGRESS);
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

            assertThat(result.getStatus()).isEqualTo(QuizAttempt.AttemptStatus.GRADED);
            assertThat(result.getScore()).isCloseTo(10.0, within(0.1));
            assertThat(result.getIsPassed()).isTrue();
            assertThat(result.getItems()).hasSize(2);
            verify(questionRepository).findAllByIds(any()); // batch fetch
            verify(eventPublisher).publish(any(QuizSubmittedEvent.class)); // P1#7: event published
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

            assertThat(result.getScore()).isCloseTo(5.0, within(0.1));
            assertThat(result.getIsPassed()).isFalse();
        }

        @Test
        @DisplayName("Should handle essay-only quiz → score 0% → not passed (provisional)")
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

            // Essay-only: 0/1 points = 0% < 70% → not passed (will be updated after manual grading)
            assertThat(result.getIsPassed()).isFalse();
            assertThat(result.getScore()).isCloseTo(0.0, within(0.1));
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

            // Default maxScoreScale is 10.0, so full marks should map to 10/10.
            assertThat(result.getScore()).isCloseTo(10.0, within(0.1));
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

            assertThat(result.getScore()).isCloseTo(10.0, within(0.1));
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

            assertThat(result.getStatus()).isEqualTo(QuizAttempt.AttemptStatus.GRADED);
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

            // TIMEOUT should be preserved even after grading so reporting can distinguish timed submissions.
            assertThat(result.getStatus()).isEqualTo(QuizAttempt.AttemptStatus.TIMEOUT);
            assertThat(result.getScore()).isNotNull(); // Still gets graded
        }
    }

    // ============================================================
    // Manual Grading Tests (Phase 2)
    // ============================================================
    @Nested
    @DisplayName("Manual Grading")
    class ManualGradingTests {

        @Test
        @DisplayName("Should manually grade an essay question and recalculate score")
        void shouldManuallyGradeEssay() {
            // Setup: attempt with 2 items — q1 auto-graded (correct), q2 essay (0 points)
            List<QuizAttempt.AttemptItem> items = new ArrayList<>();
            items.add(QuizAttempt.AttemptItem.builder()
                    .questionId(q1Id)
                    .studentAnswer(Map.of("selectedOption", "A"))
                    .isCorrect(true)
                    .pointsEarned(1.0)
                    .build());
            items.add(QuizAttempt.AttemptItem.builder()
                    .questionId(q2Id)
                    .studentAnswer(Map.of("textAnswer", "My essay"))
                    .isCorrect(false)
                    .pointsEarned(0.0)
                    .build());

            QuizAttempt attempt = QuizAttempt.builder()
                    .id(attemptId)
                    .quizId(quizId)
                    .studentId(studentId)
                    .status(QuizAttempt.AttemptStatus.SUBMITTED)
                    .score(5.0) // 1/2 points on a 10-point scale
                    .isPassed(false)
                    .items(items)
                    .build();

            List<QuizQuestion> quizQuestions = List.of(
                    QuizQuestion.create(quizId, q1Id, 0),
                    QuizQuestion.create(quizId, q2Id, 1));
            Quiz quiz = buildPublishedQuiz(quizQuestions, 70);

            UUID teacherId = UUID.randomUUID();
            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(quizRepository.isOwnedByTeacher(QuizId.of(quizId), teacherId)).thenReturn(true);
            when(attemptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            // Grade essay with full marks
            QuizAttempt result = useCase.manualGrade(attemptId, q2Id, 1.0, "Bài viết tốt!", teacherId, "TEACHER");

            assertThat(result.getScore()).isCloseTo(10.0, within(0.1)); // 2/2 points on a 10-point scale
            assertThat(result.getIsPassed()).isTrue();

            // Verify the essay item was updated
            QuizAttempt.AttemptItem essayItem = result.getItems().stream()
                    .filter(i -> q2Id.equals(i.getQuestionId()))
                    .findFirst().orElseThrow();
            assertThat(essayItem.getPointsEarned()).isCloseTo(1.0, within(0.01));
            assertThat(essayItem.getIsCorrect()).isTrue();
            assertThat(essayItem.getFeedback()).isEqualTo("Bài viết tốt!");
        }

        @Test
        @DisplayName("Should throw when question not in attempt")
        void shouldThrowWhenQuestionNotInAttempt() {
            List<QuizAttempt.AttemptItem> items = new ArrayList<>();
            items.add(QuizAttempt.AttemptItem.builder()
                    .questionId(q1Id)
                    .build());

            QuizAttempt attempt = QuizAttempt.builder()
                    .id(attemptId)
                    .quizId(quizId)
                    .studentId(studentId)
                    .status(QuizAttempt.AttemptStatus.SUBMITTED)
                    .items(items)
                    .build();

            Quiz quiz = buildPublishedQuiz(List.of(), 70);
            UUID teacherId = UUID.randomUUID();
            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(quizRepository.isOwnedByTeacher(QuizId.of(quizId), teacherId)).thenReturn(true);

            UUID unknownQuestionId = UUID.randomUUID();
            assertThatThrownBy(() -> useCase.manualGrade(attemptId, unknownQuestionId, 5.0, null, teacherId, "TEACHER"))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("không thuộc lần làm bài");
        }

        @Test
        @DisplayName("Should set isPassed=false when score below passing after manual grade")
        void shouldSetFailedWhenBelowPassing() {
            List<QuizAttempt.AttemptItem> items = new ArrayList<>();
            items.add(QuizAttempt.AttemptItem.builder()
                    .questionId(q1Id)
                    .isCorrect(false)
                    .pointsEarned(0.0)
                    .build());

            QuizAttempt attempt = QuizAttempt.builder()
                    .id(attemptId)
                    .quizId(quizId)
                    .studentId(studentId)
                    .status(QuizAttempt.AttemptStatus.SUBMITTED)
                    .score(0.0)
                    .isPassed(false)
                    .items(items)
                    .build();

            List<QuizQuestion> quizQuestions = List.of(
                    QuizQuestion.builder().quizId(quizId).questionId(q1Id).displayOrder(0).points(10).build());
            Quiz quiz = buildPublishedQuiz(quizQuestions, 70);

            UUID teacherId = UUID.randomUUID();
            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(quizRepository.isOwnedByTeacher(QuizId.of(quizId), teacherId)).thenReturn(true);
            when(attemptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            // Give 5/10 points = 50% < 70% passing
            QuizAttempt result = useCase.manualGrade(attemptId, q1Id, 5.0, null, teacherId, "TEACHER");

            assertThat(result.getScore()).isCloseTo(5.0, within(0.1));
            assertThat(result.getIsPassed()).isFalse();
        }
    }

    // ============================================================
    // Auto-Save Tests (Phase 4)
    // ============================================================
    @Nested
    @DisplayName("Save Progress (Auto-Save)")
    class SaveProgressTests {

        @Test
        @DisplayName("Should save partial answers without grading")
        void shouldSavePartialAnswers() {
            List<QuizAttempt.AttemptItem> items = new ArrayList<>();
            items.add(QuizAttempt.AttemptItem.builder().questionId(q1Id).build());
            items.add(QuizAttempt.AttemptItem.builder().questionId(q2Id).build());

            QuizAttempt attempt = QuizAttempt.builder()
                    .id(attemptId)
                    .quizId(quizId)
                    .studentId(studentId)
                    .status(QuizAttempt.AttemptStatus.IN_PROGRESS)
                    .items(items)
                    .build();

            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
            when(attemptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            List<QuizAttempt.AttemptAnswer> partialAnswers = List.of(
                    QuizAttempt.AttemptAnswer.builder()
                            .questionId(q1Id)
                            .studentAnswer(Map.of("selectedOption", "A"))
                            .build());

            QuizAttempt result = useCase.saveProgress(attemptId, studentId, partialAnswers);

            assertThat(result.getStatus()).isEqualTo(QuizAttempt.AttemptStatus.IN_PROGRESS);
            // q1 should have answer, q2 should still be blank
            QuizAttempt.AttemptItem q1Item = result.getItems().stream()
                    .filter(i -> q1Id.equals(i.getQuestionId())).findFirst().orElseThrow();
            assertThat(q1Item.getStudentAnswer()).containsEntry("selectedOption", "A");
        }

        @Test
        @DisplayName("Should throw when attempt not IN_PROGRESS")
        void shouldThrowWhenNotInProgress() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .id(attemptId)
                    .quizId(quizId)
                    .studentId(studentId)
                    .status(QuizAttempt.AttemptStatus.SUBMITTED)
                    .items(new ArrayList<>())
                    .build();

            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));

            assertThatThrownBy(() -> useCase.saveProgress(attemptId, studentId, List.of()))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("đã nộp");
        }

        @Test
        @DisplayName("Should throw when student doesn't own the attempt")
        void shouldThrowWhenNotOwner() {
            UUID otherStudentId = UUID.randomUUID();
            QuizAttempt attempt = QuizAttempt.builder()
                    .id(attemptId)
                    .quizId(quizId)
                    .studentId(otherStudentId) // Different student
                    .status(QuizAttempt.AttemptStatus.IN_PROGRESS)
                    .items(new ArrayList<>())
                    .build();

            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));

            assertThatThrownBy(() -> useCase.saveProgress(attemptId, studentId, List.of()))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("không có quyền");
        }
    }

    // ============================================================
    // getAttemptResult Security Tests (S71)
    // ============================================================
    @Nested
    @DisplayName("Get Attempt Result Security")
    class GetAttemptResultSecurityTests {

        @Test
        @DisplayName("Should throw when student views another student's attempt")
        void shouldThrowWhenStudentViewsOtherStudentAttempt() {
            UUID otherStudentId = UUID.randomUUID();
            QuizAttempt attempt = QuizAttempt.builder()
                    .id(attemptId)
                    .quizId(quizId)
                    .studentId(otherStudentId)
                    .status(QuizAttempt.AttemptStatus.SUBMITTED)
                    .items(new ArrayList<>())
                    .build();

            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));

            assertThatThrownBy(() -> useCase.getAttemptResult(attemptId, studentId, "STUDENT"))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("bài làm của mình");
        }

        @Test
        @DisplayName("Should allow student to view own attempt")
        void shouldAllowStudentToViewOwnAttempt() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .id(attemptId)
                    .quizId(quizId)
                    .studentId(studentId)
                    .status(QuizAttempt.AttemptStatus.SUBMITTED)
                    .items(new ArrayList<>())
                    .build();

            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));

            QuizAttempt result = useCase.getAttemptResult(attemptId, studentId, "STUDENT");
            assertThat(result.getId()).isEqualTo(attemptId);
        }

        @Test
        @DisplayName("Should allow teacher to view any attempt")
        void shouldAllowTeacherToViewAnyAttempt() {
            UUID teacherId = UUID.randomUUID();
            QuizAttempt attempt = QuizAttempt.builder()
                    .id(attemptId)
                    .quizId(quizId)
                    .studentId(studentId)
                    .status(QuizAttempt.AttemptStatus.SUBMITTED)
                    .items(new ArrayList<>())
                    .build();

            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));

            QuizAttempt result = useCase.getAttemptResult(attemptId, teacherId, "TEACHER");
            assertThat(result.getId()).isEqualTo(attemptId);
        }

        @Test
        @DisplayName("Should allow admin to view any attempt")
        void shouldAllowAdminToViewAnyAttempt() {
            UUID adminId = UUID.randomUUID();
            QuizAttempt attempt = QuizAttempt.builder()
                    .id(attemptId)
                    .quizId(quizId)
                    .studentId(studentId)
                    .status(QuizAttempt.AttemptStatus.SUBMITTED)
                    .items(new ArrayList<>())
                    .build();

            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));

            QuizAttempt result = useCase.getAttemptResult(attemptId, adminId, "ADMIN");
            assertThat(result.getId()).isEqualTo(attemptId);
        }
    }

    // ============================================================
    // Manual Grade Security Tests (S71)
    // ============================================================
    @Nested
    @DisplayName("Manual Grade Security")
    class ManualGradeSecurityTests {

        @Test
        @DisplayName("Should throw when teacher grades quiz they don't own")
        void shouldThrowWhenTeacherGradesQuizTheyDontOwn() {
            UUID teacherId = UUID.randomUUID();
            List<QuizAttempt.AttemptItem> items = new ArrayList<>();
            items.add(QuizAttempt.AttemptItem.builder()
                    .questionId(q1Id)
                    .pointsEarned(0.0)
                    .build());

            QuizAttempt attempt = QuizAttempt.builder()
                    .id(attemptId)
                    .quizId(quizId)
                    .studentId(studentId)
                    .status(QuizAttempt.AttemptStatus.SUBMITTED)
                    .items(items)
                    .build();

            Quiz quiz = buildPublishedQuiz(List.of(QuizQuestion.create(quizId, q1Id, 0)), 70);

            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(quizRepository.isOwnedByTeacher(QuizId.of(quizId), teacherId)).thenReturn(false);

            assertThatThrownBy(() -> useCase.manualGrade(attemptId, q1Id, 5.0, null, teacherId, "TEACHER"))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("không có quyền chấm");
        }

        @Test
        @DisplayName("Should allow admin to grade any quiz")
        void shouldAllowAdminToGradeAnyQuiz() {
            UUID adminId = UUID.randomUUID();
            List<QuizAttempt.AttemptItem> items = new ArrayList<>();
            items.add(QuizAttempt.AttemptItem.builder()
                    .questionId(q1Id)
                    .pointsEarned(0.0)
                    .isCorrect(false)
                    .build());

            QuizAttempt attempt = QuizAttempt.builder()
                    .id(attemptId)
                    .quizId(quizId)
                    .studentId(studentId)
                    .status(QuizAttempt.AttemptStatus.SUBMITTED)
                    .items(items)
                    .build();

            List<QuizQuestion> quizQuestions = List.of(QuizQuestion.create(quizId, q1Id, 0));
            Quiz quiz = buildPublishedQuiz(quizQuestions, 70);

            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(attemptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            // Admin should not need ownership check
            QuizAttempt result = useCase.manualGrade(attemptId, q1Id, 1.0, "Tốt", adminId, "ADMIN");
            assertThat(result).isNotNull();
            verify(quizRepository, never()).isOwnedByTeacher(any(), any());
        }
    }

    // ============================================================
    // Essay Pass Provisional Tests (S71)
    // ============================================================
    @Nested
    @DisplayName("Essay Provisional Pass")
    class EssayProvisionalPassTests {

        @Test
        @DisplayName("Should pass provisionally when essay present but auto-graded score above threshold")
        void shouldPassProvisionallyWhenEssayPresentButScoreAboveThreshold() {
            // 2 questions: q1 single choice (correct), q2 essay (0 points auto)
            List<QuizQuestion> quizQuestions = List.of(
                    QuizQuestion.create(quizId, q1Id, 0),
                    QuizQuestion.create(quizId, q2Id, 1));
            // passingScore = 40 so that 50% (1/2) passes
            Quiz quiz = buildPublishedQuiz(quizQuestions, 40);

            QuizAttempt attempt = buildInProgressAttempt(List.of(q1Id, q2Id));

            Question scQ = buildSingleChoiceQuestion(q1Id, "A");
            Question essayQ = Question.builder()
                    .id(q2Id)
                    .questionType(Question.QuestionType.ESSAY)
                    .status(Question.Status.ACTIVE)
                    .build();

            when(attemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(questionRepository.findAllByIds(any())).thenReturn(List.of(scQ, essayQ));
            when(attemptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            List<QuizAttempt.AttemptAnswer> answers = List.of(
                    QuizAttempt.AttemptAnswer.builder()
                            .questionId(q1Id)
                            .studentAnswer(Map.of("selectedOption", "A"))
                            .build(),
                    QuizAttempt.AttemptAnswer.builder()
                            .questionId(q2Id)
                            .studentAnswer(Map.of("textAnswer", "Essay content"))
                            .build());

            QuizAttempt result = useCase.submitAttempt(attemptId, answers);

            // 1/2 points = 50% >= 40% → provisional pass
            assertThat(result.getIsPassed()).isTrue();
            assertThat(result.getScore()).isCloseTo(5.0, within(0.1));
        }
    }

    // ============================================================
    // Ownership Validation Tests (Phase 3)
    // ============================================================
    @Nested
    @DisplayName("Teacher Ownership Validation")
    class OwnershipValidationTests {

        @Test
        @DisplayName("QuizManagementUseCase should reject non-owner teacher")
        void shouldRejectNonOwnerTeacher() {
            // This test validates the QuizManagementUseCase ownership check
            // by verifying the QuizRepository.isOwnedByTeacher contract
            QuizManagementUseCase mgmtUseCase = new QuizManagementUseCase(quizRepository);

            Quiz quiz = buildPublishedQuiz(List.of(), 70);
            UUID teacherId = UUID.randomUUID();

            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(quizRepository.isOwnedByTeacher(QuizId.of(quizId), teacherId)).thenReturn(false);

            assertThatThrownBy(() -> mgmtUseCase.deleteQuiz(quizId, teacherId, "TEACHER"))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("không có quyền");
        }

        @Test
        @DisplayName("ADMIN should bypass ownership check")
        void shouldBypassForAdmin() {
            QuizManagementUseCase mgmtUseCase = new QuizManagementUseCase(quizRepository);

            Quiz quiz = buildPublishedQuiz(List.of(), 70);
            UUID adminId = UUID.randomUUID();

            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));

            // Should NOT call isOwnedByTeacher — admin bypasses
            mgmtUseCase.deleteQuiz(quizId, adminId, "ADMIN");

            verify(quizRepository, never()).isOwnedByTeacher(any(), any());
            verify(quizRepository).delete(quiz);
        }

        @Test
        @DisplayName("ORG_ADMIN should bypass ownership check")
        void shouldBypassForOrgAdmin() {
            QuizManagementUseCase mgmtUseCase = new QuizManagementUseCase(quizRepository);

            Quiz quiz = buildPublishedQuiz(List.of(), 70);
            UUID orgAdminId = UUID.randomUUID();

            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));

            mgmtUseCase.deleteQuiz(quizId, orgAdminId, "ORG_ADMIN");

            verify(quizRepository, never()).isOwnedByTeacher(any(), any());
            verify(quizRepository).delete(quiz);
        }
    }

    // ============================================================
    // getQuizPreflight Tests
    // ============================================================
    @Nested
    @DisplayName("Get Quiz Preflight")
    class GetQuizPreflightTests {

        private Quiz buildQuizWithSettings(Quiz.QuizSettings settings) {
            return Quiz.builder()
                    .id(QuizId.of(quizId))
                    .lessonId(UUID.randomUUID())
                    .title("Preflight Quiz")
                    .settings(settings)
                    .status(Quiz.QuizStatus.PUBLISHED)
                    .questions(List.of(QuizQuestion.create(quizId, q1Id, 0)))
                    .build();
        }

        private void stubNoInProgressAttempt() {
            when(attemptRepository.findInProgressByQuizIdAndStudentId(quizId, studentId))
                    .thenReturn(Optional.empty());
            when(attemptRepository.countCompletedByQuizIdAndStudentId(quizId, studentId))
                    .thenReturn(0L);
        }

        @Test
        @DisplayName("Should return null effectiveTimeLimitSeconds when no time limit and no lockAt")
        void shouldReturnNullEffectiveLimitWhenUnlimited() {
            Quiz quiz = buildQuizWithSettings(Quiz.QuizSettings.builder()
                    .passingScore(70).maxAttempts(3).build());
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            stubNoInProgressAttempt();

            Map<String, Object> result = useCase.getQuizPreflight(quizId, studentId);

            assertThat(result.get("effectiveTimeLimitSeconds")).isNull();
            assertThat(result.get("lockAt")).isNull();
            assertThat(result.get("dueAt")).isNull();
            assertThat(result.get("availableFrom")).isNull();
        }

        @Test
        @DisplayName("Should return effectiveTimeLimitSeconds = timeLimitMinutes*60 when no lockAt")
        void shouldReturnFullTimeLimitWhenNoLockAt() {
            Quiz quiz = buildQuizWithSettings(Quiz.QuizSettings.builder()
                    .timeLimitMinutes(30).passingScore(70).maxAttempts(3).build());
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            stubNoInProgressAttempt();

            Map<String, Object> result = useCase.getQuizPreflight(quizId, studentId);

            assertThat((Long) result.get("effectiveTimeLimitSeconds")).isEqualTo(1800L);
        }

        @Test
        @DisplayName("Should return effectiveTimeLimitSeconds = secondsUntilLockAt when only lockAt set (no time limit)")
        void shouldReturnSecondsUntilLockAtWhenOnlyLockAt() {
            Instant lockAt = Instant.now().plusSeconds(600); // 10 min from now
            Quiz quiz = buildQuizWithSettings(Quiz.QuizSettings.builder()
                    .passingScore(70).maxAttempts(3).lockAt(lockAt).build());
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            stubNoInProgressAttempt();

            Map<String, Object> result = useCase.getQuizPreflight(quizId, studentId);

            Long effective = (Long) result.get("effectiveTimeLimitSeconds");
            // Allow ±2s tolerance for test execution time
            assertThat(effective).isBetween(598L, 601L);
        }

        @Test
        @DisplayName("Should cap effectiveTimeLimitSeconds at secondsUntilLockAt when lockAt is sooner than time limit")
        void shouldCapEffectiveLimitAtLockAtWhenSooner() {
            Instant lockAt = Instant.now().plusSeconds(300); // 5 min from now
            // Quiz has 30 min limit, but lockAt is only 5 min away
            Quiz quiz = buildQuizWithSettings(Quiz.QuizSettings.builder()
                    .timeLimitMinutes(30).passingScore(70).maxAttempts(3).lockAt(lockAt).build());
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            stubNoInProgressAttempt();

            Map<String, Object> result = useCase.getQuizPreflight(quizId, studentId);

            Long effective = (Long) result.get("effectiveTimeLimitSeconds");
            // Should be ~300s (lockAt), NOT 1800s (time limit)
            assertThat(effective).isBetween(298L, 301L);
        }

        @Test
        @DisplayName("Should NOT cap effectiveTimeLimitSeconds when time limit is sooner than lockAt")
        void shouldNotCapWhenTimeLimitSoonerThanLockAt() {
            Instant lockAt = Instant.now().plusSeconds(3600); // 1h from now (far away)
            // Quiz has 10 min limit — time limit is sooner than lockAt
            Quiz quiz = buildQuizWithSettings(Quiz.QuizSettings.builder()
                    .timeLimitMinutes(10).passingScore(70).maxAttempts(3).lockAt(lockAt).build());
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            stubNoInProgressAttempt();

            Map<String, Object> result = useCase.getQuizPreflight(quizId, studentId);

            Long effective = (Long) result.get("effectiveTimeLimitSeconds");
            // Should be 600s (10 min), NOT 3600s (lockAt)
            assertThat(effective).isEqualTo(600L);
        }

        @Test
        @DisplayName("Should return all 3 schedule dates in response as ISO strings")
        void shouldReturnScheduleDatesInResponse() {
            Instant availableFrom = Instant.now().minusSeconds(3600);
            Instant dueAt = Instant.now().plusSeconds(1800);
            Instant lockAt = Instant.now().plusSeconds(3600);
            Quiz quiz = buildQuizWithSettings(Quiz.QuizSettings.builder()
                    .timeLimitMinutes(30).passingScore(70).maxAttempts(3)
                    .availableFrom(availableFrom).dueAt(dueAt).lockAt(lockAt)
                    .build());
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            stubNoInProgressAttempt();

            Map<String, Object> result = useCase.getQuizPreflight(quizId, studentId);

            assertThat(result.get("availableFrom")).isEqualTo(availableFrom.toString());
            assertThat(result.get("dueAt")).isEqualTo(dueAt.toString());
            assertThat(result.get("lockAt")).isEqualTo(lockAt.toString());
        }

        @Test
        @DisplayName("Should auto-expire stale IN_PROGRESS attempt when lockAt has passed")
        void shouldAutoExpireAttemptWhenLockAtPassed() {
            // lockAt was 1 minute ago
            Instant lockAt = Instant.now().minusSeconds(60);
            Quiz quiz = buildQuizWithSettings(Quiz.QuizSettings.builder()
                    .timeLimitMinutes(30).passingScore(70).maxAttempts(3).lockAt(lockAt).build());

            QuizAttempt staleAttempt = QuizAttempt.builder()
                    .id(attemptId).quizId(quizId).studentId(studentId)
                    .status(QuizAttempt.AttemptStatus.IN_PROGRESS)
                    .startTime(Instant.now().minusSeconds(120)) // started 2 min ago
                    .items(new ArrayList<>())
                    .build();

            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(attemptRepository.findInProgressByQuizIdAndStudentId(quizId, studentId))
                    .thenReturn(Optional.of(staleAttempt));
            when(attemptRepository.save(any())).thenAnswer(i -> i.getArgument(0));
            when(attemptRepository.countCompletedByQuizIdAndStudentId(quizId, studentId))
                    .thenReturn(0L);

            Map<String, Object> result = useCase.getQuizPreflight(quizId, studentId);

            // Attempt should have been expired (markTimeout called → status changes)
            verify(attemptRepository).save(argThat(a ->
                    a.getStatus() == QuizAttempt.AttemptStatus.TIMEOUT));
            // No in-progress attempt in response
            assertThat(result.get("inProgressAttempt")).isNull();
        }

        @Test
        @DisplayName("Should auto-expire stale IN_PROGRESS attempt when timeLimitMinutes exceeded (no lockAt)")
        void shouldAutoExpireAttemptWhenTimeLimitExceeded() {
            // 5-minute time limit, attempt started 10 minutes ago → stale
            Quiz quiz = buildQuizWithSettings(Quiz.QuizSettings.builder()
                    .timeLimitMinutes(5).passingScore(70).maxAttempts(3).build());

            QuizAttempt staleAttempt = QuizAttempt.builder()
                    .id(attemptId).quizId(quizId).studentId(studentId)
                    .status(QuizAttempt.AttemptStatus.IN_PROGRESS)
                    .startTime(Instant.now().minusSeconds(660)) // 11 min ago (> 5 min + 60s grace)
                    .items(new ArrayList<>())
                    .build();

            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(attemptRepository.findInProgressByQuizIdAndStudentId(quizId, studentId))
                    .thenReturn(Optional.of(staleAttempt));
            when(attemptRepository.save(any())).thenAnswer(i -> i.getArgument(0));
            when(attemptRepository.countCompletedByQuizIdAndStudentId(quizId, studentId))
                    .thenReturn(0L);

            Map<String, Object> result = useCase.getQuizPreflight(quizId, studentId);

            verify(attemptRepository).save(argThat(a ->
                    a.getStatus() == QuizAttempt.AttemptStatus.TIMEOUT));
            assertThat(result.get("inProgressAttempt")).isNull();
        }

        @Test
        @DisplayName("Should NOT expire active attempt still within time limit and before lockAt")
        void shouldNotExpireActiveAttempt() {
            Instant lockAt = Instant.now().plusSeconds(600); // lockAt still 10 min away
            // 30 min limit, attempt started 5 min ago → still valid
            Quiz quiz = buildQuizWithSettings(Quiz.QuizSettings.builder()
                    .timeLimitMinutes(30).passingScore(70).maxAttempts(3).lockAt(lockAt).build());

            QuizAttempt activeAttempt = QuizAttempt.builder()
                    .id(attemptId).quizId(quizId).studentId(studentId)
                    .status(QuizAttempt.AttemptStatus.IN_PROGRESS)
                    .startTime(Instant.now().minusSeconds(300)) // started 5 min ago
                    .items(new ArrayList<>())
                    .build();

            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(attemptRepository.findInProgressByQuizIdAndStudentId(quizId, studentId))
                    .thenReturn(Optional.of(activeAttempt));
            when(attemptRepository.countCompletedByQuizIdAndStudentId(quizId, studentId))
                    .thenReturn(0L);

            Map<String, Object> result = useCase.getQuizPreflight(quizId, studentId);

            verify(attemptRepository, never()).save(any());
            assertThat(result.get("inProgressAttempt")).isNotNull();
        }

        @Test
        @DisplayName("Should cap resume timeRemainingSeconds at lockAt when lockAt is sooner than time limit")
        void shouldCapResumeTimeAtLockAt() {
            Instant lockAt = Instant.now().plusSeconds(120); // lockAt only 2 min away
            // 30-min limit, attempt started 1 min ago → 29 min limit-based remaining
            // But lockAt is only 2 min away → effective remaining = 2 min
            Quiz quiz = buildQuizWithSettings(Quiz.QuizSettings.builder()
                    .timeLimitMinutes(30).passingScore(70).maxAttempts(3).lockAt(lockAt).build());

            QuizAttempt activeAttempt = QuizAttempt.builder()
                    .id(attemptId).quizId(quizId).studentId(studentId)
                    .status(QuizAttempt.AttemptStatus.IN_PROGRESS)
                    .startTime(Instant.now().minusSeconds(60)) // started 1 min ago
                    .items(new ArrayList<>())
                    .build();

            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(attemptRepository.findInProgressByQuizIdAndStudentId(quizId, studentId))
                    .thenReturn(Optional.of(activeAttempt));
            when(attemptRepository.countCompletedByQuizIdAndStudentId(quizId, studentId))
                    .thenReturn(0L);

            Map<String, Object> result = useCase.getQuizPreflight(quizId, studentId);

            @SuppressWarnings("unchecked")
            Map<String, Object> resumeInfo = (Map<String, Object>) result.get("inProgressAttempt");
            Long timeRemaining = (Long) resumeInfo.get("timeRemainingSeconds");
            // Should be ~120s (lockAt-based), NOT ~1740s (time-limit-based)
            assertThat(timeRemaining).isBetween(118L, 121L);
        }

        @Test
        @DisplayName("Should return full time limit remaining in resume when lockAt is far away")
        void shouldReturnFullTimeLimitRemainingWhenLockAtFar() {
            Instant lockAt = Instant.now().plusSeconds(7200); // lockAt 2h away
            // 10-min limit, attempt started 2 min ago → 8 min remaining from limit
            Quiz quiz = buildQuizWithSettings(Quiz.QuizSettings.builder()
                    .timeLimitMinutes(10).passingScore(70).maxAttempts(3).lockAt(lockAt).build());

            QuizAttempt activeAttempt = QuizAttempt.builder()
                    .id(attemptId).quizId(quizId).studentId(studentId)
                    .status(QuizAttempt.AttemptStatus.IN_PROGRESS)
                    .startTime(Instant.now().minusSeconds(120)) // started 2 min ago
                    .items(new ArrayList<>())
                    .build();

            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            when(attemptRepository.findInProgressByQuizIdAndStudentId(quizId, studentId))
                    .thenReturn(Optional.of(activeAttempt));
            when(attemptRepository.countCompletedByQuizIdAndStudentId(quizId, studentId))
                    .thenReturn(0L);

            Map<String, Object> result = useCase.getQuizPreflight(quizId, studentId);

            @SuppressWarnings("unchecked")
            Map<String, Object> resumeInfo = (Map<String, Object>) result.get("inProgressAttempt");
            Long timeRemaining = (Long) resumeInfo.get("timeRemainingSeconds");
            // Should be ~480s (10min - 2min elapsed), NOT 7200s (lockAt-based)
            assertThat(timeRemaining).isBetween(478L, 481L);
        }

        @Test
        @DisplayName("Should return inProgressAttempt=null when no in-progress attempt")
        void shouldReturnNullInProgressWhenNone() {
            Quiz quiz = buildQuizWithSettings(Quiz.QuizSettings.builder()
                    .timeLimitMinutes(30).passingScore(70).maxAttempts(3).build());
            when(quizRepository.findById(QuizId.of(quizId))).thenReturn(Optional.of(quiz));
            stubNoInProgressAttempt();

            Map<String, Object> result = useCase.getQuizPreflight(quizId, studentId);

            assertThat(result.get("inProgressAttempt")).isNull();
            assertThat(result.get("completedAttempts")).isEqualTo(0L);
        }
    }
}
