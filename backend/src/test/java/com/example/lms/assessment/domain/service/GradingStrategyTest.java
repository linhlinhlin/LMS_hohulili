package com.example.lms.assessment.domain.service;

import com.example.lms.assessment.domain.model.Question;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * Comprehensive unit tests for all GradingStrategy implementations.
 * Covers: SingleChoice, MultipleChoice, TrueFalse, FillInBlank, ShortAnswer, Essay.
 */
@DisplayName("GradingStrategy Tests")
class GradingStrategyTest {

    // ============================================================
    // Helper: build a Question with given type + answerKey
    // ============================================================
    private Question buildQuestion(Question.QuestionType type, String correctOption, Map<String, Object> answerKey) {
        return Question.builder()
                .id(UUID.randomUUID())
                .questionType(type)
                .correctOption(correctOption)
                .answerKey(answerKey)
                .status(Question.Status.ACTIVE)
                .difficulty(Question.Difficulty.MEDIUM)
                .build();
    }

    // ============================================================
    // SingleChoiceGradingStrategy
    // ============================================================
    @Nested
    @DisplayName("SingleChoice Grading")
    class SingleChoiceTests {
        private final SingleChoiceGradingStrategy strategy = new SingleChoiceGradingStrategy();

        @Test
        @DisplayName("Should return correct when answer matches")
        void shouldReturnCorrectWhenMatches() {
            Question q = buildQuestion(Question.QuestionType.SINGLE_CHOICE, null,
                    Map.of("correctOption", "A"));
            var result = strategy.grade(q, Map.of("selectedOption", "A"));

            assertThat(result.correct()).isTrue();
            assertThat(result.pointsEarned()).isEqualTo(1.0);
        }

        @Test
        @DisplayName("Should return correct case-insensitive")
        void shouldBeCaseInsensitive() {
            Question q = buildQuestion(Question.QuestionType.SINGLE_CHOICE, null,
                    Map.of("correctOption", "B"));
            var result = strategy.grade(q, Map.of("selectedOption", "b"));

            assertThat(result.correct()).isTrue();
        }

        @Test
        @DisplayName("Should return incorrect when answer wrong")
        void shouldReturnIncorrectWhenWrong() {
            Question q = buildQuestion(Question.QuestionType.SINGLE_CHOICE, null,
                    Map.of("correctOption", "A"));
            var result = strategy.grade(q, Map.of("selectedOption", "C"));

            assertThat(result.correct()).isFalse();
            assertThat(result.pointsEarned()).isEqualTo(0.0);
        }

        @Test
        @DisplayName("Should return incorrect when null answer")
        void shouldReturnIncorrectWhenNull() {
            Question q = buildQuestion(Question.QuestionType.SINGLE_CHOICE, null,
                    Map.of("correctOption", "A"));
            var result = strategy.grade(q, null);

            assertThat(result.correct()).isFalse();
        }

        @Test
        @DisplayName("Should fall back to legacy correctOption")
        void shouldFallBackToLegacyCorrectOption() {
            Question q = buildQuestion(Question.QuestionType.SINGLE_CHOICE, "D", null);
            var result = strategy.grade(q, Map.of("selectedOption", "D"));

            assertThat(result.correct()).isTrue();
        }

        @Test
        @DisplayName("Should trim whitespace in answer")
        void shouldTrimWhitespace() {
            Question q = buildQuestion(Question.QuestionType.SINGLE_CHOICE, null,
                    Map.of("correctOption", "A"));
            var result = strategy.grade(q, Map.of("selectedOption", "  A  "));

            assertThat(result.correct()).isTrue();
        }

        @Test
        @DisplayName("Should return correct QuestionType")
        void shouldReturnCorrectQuestionType() {
            assertThat(strategy.getQuestionType()).isEqualTo(Question.QuestionType.SINGLE_CHOICE);
        }
    }

    // ============================================================
    // MultipleChoiceGradingStrategy
    // ============================================================
    @Nested
    @DisplayName("MultipleChoice Grading")
    class MultipleChoiceTests {
        private final MultipleChoiceGradingStrategy strategy = new MultipleChoiceGradingStrategy();

        @Test
        @DisplayName("Should return correct when all options match")
        void shouldReturnCorrectWhenAllMatch() {
            Question q = buildQuestion(Question.QuestionType.MULTIPLE_CHOICE, null,
                    Map.of("correctOptions", List.of("A", "C")));
            var result = strategy.grade(q, Map.of("selectedOptions", List.of("A", "C")));

            assertThat(result.correct()).isTrue();
            assertThat(result.pointsEarned()).isEqualTo(1.0);
        }

        @Test
        @DisplayName("Should return partial credit for partially correct")
        void shouldReturnPartialCredit() {
            // Correct: A, C (2 items). Student selects A only → 1/2 = 0.5
            Question q = buildQuestion(Question.QuestionType.MULTIPLE_CHOICE, null,
                    Map.of("correctOptions", List.of("A", "C")));
            var result = strategy.grade(q, Map.of("selectedOptions", List.of("A")));

            assertThat(result.correct()).isFalse();
            assertThat(result.pointsEarned()).isCloseTo(0.5, within(0.01));
        }

        @Test
        @DisplayName("Should penalize incorrect selections")
        void shouldPenalizeIncorrect() {
            // Correct: A, C. Student: A, B → correct=1, incorrect=1 → (1-1)/2 = 0
            Question q = buildQuestion(Question.QuestionType.MULTIPLE_CHOICE, null,
                    Map.of("correctOptions", List.of("A", "C")));
            var result = strategy.grade(q, Map.of("selectedOptions", List.of("A", "B")));

            assertThat(result.pointsEarned()).isEqualTo(0.0);
        }

        @Test
        @DisplayName("Should clamp negative score to zero")
        void shouldClampNegativeToZero() {
            // Correct: A. Student: B, C, D → correct=0, incorrect=3 → (0-3)/1 = -3 → clamped to 0
            Question q = buildQuestion(Question.QuestionType.MULTIPLE_CHOICE, null,
                    Map.of("correctOptions", List.of("A")));
            var result = strategy.grade(q, Map.of("selectedOptions", List.of("B", "C", "D")));

            assertThat(result.pointsEarned()).isEqualTo(0.0);
            assertThat(result.correct()).isFalse();
        }

        @Test
        @DisplayName("Should return incorrect for empty selection")
        void shouldReturnIncorrectForEmpty() {
            Question q = buildQuestion(Question.QuestionType.MULTIPLE_CHOICE, null,
                    Map.of("correctOptions", List.of("A", "C")));
            var result = strategy.grade(q, Map.of("selectedOptions", List.of()));

            assertThat(result.correct()).isFalse();
        }

        @Test
        @DisplayName("Should return incorrect for null answer")
        void shouldReturnIncorrectForNull() {
            Question q = buildQuestion(Question.QuestionType.MULTIPLE_CHOICE, null,
                    Map.of("correctOptions", List.of("A", "C")));
            var result = strategy.grade(q, null);

            assertThat(result.correct()).isFalse();
        }

        @Test
        @DisplayName("Should be case-insensitive")
        void shouldBeCaseInsensitive() {
            Question q = buildQuestion(Question.QuestionType.MULTIPLE_CHOICE, null,
                    Map.of("correctOptions", List.of("A", "C")));
            var result = strategy.grade(q, Map.of("selectedOptions", List.of("a", "c")));

            assertThat(result.correct()).isTrue();
        }

        @Test
        @DisplayName("Should fall back to legacy comma-separated correctOption")
        void shouldFallBackToLegacy() {
            Question q = buildQuestion(Question.QuestionType.MULTIPLE_CHOICE, "A,C", null);
            var result = strategy.grade(q, Map.of("selectedOptions", List.of("A", "C")));

            assertThat(result.correct()).isTrue();
        }

        @Test
        @DisplayName("Should handle single selectedOption legacy format")
        void shouldHandleLegacySingleOption() {
            Question q = buildQuestion(Question.QuestionType.MULTIPLE_CHOICE, null,
                    Map.of("correctOptions", List.of("A")));
            var result = strategy.grade(q, Map.of("selectedOption", "A"));

            assertThat(result.correct()).isTrue();
        }

        @Test
        @DisplayName("Should return correct QuestionType")
        void shouldReturnCorrectQuestionType() {
            assertThat(strategy.getQuestionType()).isEqualTo(Question.QuestionType.MULTIPLE_CHOICE);
        }
    }

    // ============================================================
    // TrueFalseGradingStrategy
    // ============================================================
    @Nested
    @DisplayName("TrueFalse Grading")
    class TrueFalseTests {
        private final TrueFalseGradingStrategy strategy = new TrueFalseGradingStrategy();

        @Test
        @DisplayName("Should return correct for true answer")
        void shouldReturnCorrectForTrue() {
            Question q = buildQuestion(Question.QuestionType.TRUE_FALSE, null,
                    Map.of("correctOption", "true"));
            var result = strategy.grade(q, Map.of("selectedOption", "true"));

            assertThat(result.correct()).isTrue();
        }

        @Test
        @DisplayName("Should return correct for false answer")
        void shouldReturnCorrectForFalse() {
            Question q = buildQuestion(Question.QuestionType.TRUE_FALSE, null,
                    Map.of("correctOption", "false"));
            var result = strategy.grade(q, Map.of("selectedOption", "false"));

            assertThat(result.correct()).isTrue();
        }

        @Test
        @DisplayName("Should be case-insensitive")
        void shouldBeCaseInsensitive() {
            Question q = buildQuestion(Question.QuestionType.TRUE_FALSE, null,
                    Map.of("correctOption", "TRUE"));
            var result = strategy.grade(q, Map.of("selectedOption", "true"));

            assertThat(result.correct()).isTrue();
        }

        @Test
        @DisplayName("Should return incorrect for wrong answer")
        void shouldReturnIncorrectForWrong() {
            Question q = buildQuestion(Question.QuestionType.TRUE_FALSE, null,
                    Map.of("correctOption", "true"));
            var result = strategy.grade(q, Map.of("selectedOption", "false"));

            assertThat(result.correct()).isFalse();
        }

        @Test
        @DisplayName("Should fall back to legacy correctOption")
        void shouldFallBackToLegacy() {
            Question q = buildQuestion(Question.QuestionType.TRUE_FALSE, "true", null);
            var result = strategy.grade(q, Map.of("selectedOption", "true"));

            assertThat(result.correct()).isTrue();
        }

        @Test
        @DisplayName("Should return incorrect for null answer")
        void shouldReturnIncorrectForNull() {
            Question q = buildQuestion(Question.QuestionType.TRUE_FALSE, null,
                    Map.of("correctOption", "true"));
            var result = strategy.grade(q, null);

            assertThat(result.correct()).isFalse();
        }
    }

    // ============================================================
    // FillInBlankGradingStrategy
    // ============================================================
    @Nested
    @DisplayName("FillInBlank Grading")
    class FillInBlankTests {
        private final FillInBlankGradingStrategy strategy = new FillInBlankGradingStrategy();

        @Test
        @DisplayName("Should return correct when answer matches")
        void shouldReturnCorrectWhenMatches() {
            Question q = buildQuestion(Question.QuestionType.FILL_IN_BLANK, null,
                    Map.of("acceptedAnswers", List.of("Paris")));
            var result = strategy.grade(q, Map.of("textAnswer", "Paris"));

            assertThat(result.correct()).isTrue();
        }

        @Test
        @DisplayName("Should be case-insensitive by default")
        void shouldBeCaseInsensitiveByDefault() {
            Question q = buildQuestion(Question.QuestionType.FILL_IN_BLANK, null,
                    Map.of("acceptedAnswers", List.of("Paris")));
            var result = strategy.grade(q, Map.of("textAnswer", "paris"));

            assertThat(result.correct()).isTrue();
        }

        @Test
        @DisplayName("Should respect case-sensitive flag")
        void shouldRespectCaseSensitive() {
            Question q = buildQuestion(Question.QuestionType.FILL_IN_BLANK, null,
                    Map.of("acceptedAnswers", List.of("Paris"), "caseSensitive", true));
            var result = strategy.grade(q, Map.of("textAnswer", "paris"));

            assertThat(result.correct()).isFalse();
        }

        @Test
        @DisplayName("Should accept multiple accepted answers")
        void shouldAcceptMultipleAnswers() {
            Question q = buildQuestion(Question.QuestionType.FILL_IN_BLANK, null,
                    Map.of("acceptedAnswers", List.of("4", "four", "Four")));

            assertThat(strategy.grade(q, Map.of("textAnswer", "4")).correct()).isTrue();
            assertThat(strategy.grade(q, Map.of("textAnswer", "four")).correct()).isTrue();
            assertThat(strategy.grade(q, Map.of("textAnswer", "FOUR")).correct()).isTrue();
        }

        @Test
        @DisplayName("Should return incorrect for wrong answer")
        void shouldReturnIncorrectForWrong() {
            Question q = buildQuestion(Question.QuestionType.FILL_IN_BLANK, null,
                    Map.of("acceptedAnswers", List.of("Paris")));
            var result = strategy.grade(q, Map.of("textAnswer", "London"));

            assertThat(result.correct()).isFalse();
        }

        @Test
        @DisplayName("Should return incorrect for empty text")
        void shouldReturnIncorrectForEmpty() {
            Question q = buildQuestion(Question.QuestionType.FILL_IN_BLANK, null,
                    Map.of("acceptedAnswers", List.of("Paris")));
            var result = strategy.grade(q, Map.of("textAnswer", ""));

            assertThat(result.correct()).isFalse();
        }

        @Test
        @DisplayName("Should return incorrect for null answer")
        void shouldReturnIncorrectForNull() {
            Question q = buildQuestion(Question.QuestionType.FILL_IN_BLANK, null,
                    Map.of("acceptedAnswers", List.of("Paris")));
            var result = strategy.grade(q, null);

            assertThat(result.correct()).isFalse();
        }

        @Test
        @DisplayName("Should fall back to legacy correctOption")
        void shouldFallBackToLegacy() {
            Question q = buildQuestion(Question.QuestionType.FILL_IN_BLANK, "Paris", null);
            var result = strategy.grade(q, Map.of("textAnswer", "paris"));

            assertThat(result.correct()).isTrue();
        }

        @Test
        @DisplayName("Should trim whitespace")
        void shouldTrimWhitespace() {
            Question q = buildQuestion(Question.QuestionType.FILL_IN_BLANK, null,
                    Map.of("acceptedAnswers", List.of("Paris")));
            var result = strategy.grade(q, Map.of("textAnswer", "  Paris  "));

            assertThat(result.correct()).isTrue();
        }
    }

    // ============================================================
    // ShortAnswerGradingStrategy
    // ============================================================
    @Nested
    @DisplayName("ShortAnswer Grading")
    class ShortAnswerTests {
        private final ShortAnswerGradingStrategy strategy = new ShortAnswerGradingStrategy();

        @Test
        @DisplayName("Should return correct when matches accepted answer")
        void shouldReturnCorrectWhenMatches() {
            Question q = buildQuestion(Question.QuestionType.SHORT_ANSWER, null,
                    Map.of("acceptedAnswers", List.of("mitochondria", "Mitochondria")));
            var result = strategy.grade(q, Map.of("textAnswer", "mitochondria"));

            assertThat(result.correct()).isTrue();
        }

        @Test
        @DisplayName("Should be case-insensitive by default")
        void shouldBeCaseInsensitive() {
            Question q = buildQuestion(Question.QuestionType.SHORT_ANSWER, null,
                    Map.of("acceptedAnswers", List.of("Mitochondria")));
            var result = strategy.grade(q, Map.of("textAnswer", "MITOCHONDRIA"));

            assertThat(result.correct()).isTrue();
        }

        @Test
        @DisplayName("Should return incorrect for wrong answer")
        void shouldReturnIncorrectForWrong() {
            Question q = buildQuestion(Question.QuestionType.SHORT_ANSWER, null,
                    Map.of("acceptedAnswers", List.of("mitochondria")));
            var result = strategy.grade(q, Map.of("textAnswer", "nucleus"));

            assertThat(result.correct()).isFalse();
        }

        @Test
        @DisplayName("Should return incorrect for null")
        void shouldReturnIncorrectForNull() {
            Question q = buildQuestion(Question.QuestionType.SHORT_ANSWER, null,
                    Map.of("acceptedAnswers", List.of("answer")));
            var result = strategy.grade(q, null);

            assertThat(result.correct()).isFalse();
        }

        @Test
        @DisplayName("Should fall back to legacy correctOption")
        void shouldFallBackToLegacy() {
            Question q = buildQuestion(Question.QuestionType.SHORT_ANSWER, "mitochondria", null);
            var result = strategy.grade(q, Map.of("textAnswer", "Mitochondria"));

            assertThat(result.correct()).isTrue();
        }
    }

    // ============================================================
    // EssayGradingStrategy
    // ============================================================
    @Nested
    @DisplayName("Essay Grading")
    class EssayTests {
        private final EssayGradingStrategy strategy = new EssayGradingStrategy();

        @Test
        @DisplayName("Should return pending manual grading")
        void shouldReturnPendingManualGrading() {
            Question q = buildQuestion(Question.QuestionType.ESSAY, null, null);
            var result = strategy.grade(q, Map.of("textAnswer", "This is my essay..."));

            assertThat(result.correct()).isFalse();
            assertThat(result.pointsEarned()).isEqualTo(0.0);
            assertThat(result.feedback()).contains("Chờ chấm điểm thủ công");
        }

        @Test
        @DisplayName("Should use maxScore from answerKey")
        void shouldUseMaxScoreFromAnswerKey() {
            Question q = buildQuestion(Question.QuestionType.ESSAY, null,
                    Map.of("maxScore", 10));
            var result = strategy.grade(q, Map.of("textAnswer", "Essay text"));

            assertThat(result.maxPoints()).isEqualTo(10.0);
            assertThat(result.pointsEarned()).isEqualTo(0.0);
        }

        @Test
        @DisplayName("Should default maxPoints to 1.0 when no maxScore")
        void shouldDefaultMaxPoints() {
            Question q = buildQuestion(Question.QuestionType.ESSAY, null, null);
            var result = strategy.grade(q, Map.of("textAnswer", "Essay"));

            assertThat(result.maxPoints()).isEqualTo(1.0);
        }

        @Test
        @DisplayName("Should return pending even with null answer")
        void shouldReturnPendingForNull() {
            Question q = buildQuestion(Question.QuestionType.ESSAY, null, null);
            var result = strategy.grade(q, null);

            assertThat(result.feedback()).contains("Chờ chấm điểm thủ công");
        }
    }
}
