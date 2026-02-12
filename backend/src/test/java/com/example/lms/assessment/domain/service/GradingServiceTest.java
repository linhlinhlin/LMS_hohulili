package com.example.lms.assessment.domain.service;

import com.example.lms.assessment.domain.model.Question;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for GradingService (EnumMap dispatch + points override).
 */
@DisplayName("GradingService Tests")
class GradingServiceTest {

    private GradingService gradingService;

    @BeforeEach
    void setUp() {
        gradingService = new GradingService();
    }

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

    @Nested
    @DisplayName("Dispatch Tests")
    class DispatchTests {

        @Test
        @DisplayName("Should dispatch SINGLE_CHOICE correctly")
        void shouldDispatchSingleChoice() {
            Question q = buildQuestion(Question.QuestionType.SINGLE_CHOICE, null,
                    Map.of("correctOption", "A"));
            var result = gradingService.grade(q, Map.of("selectedOption", "A"), null);

            assertThat(result.correct()).isTrue();
        }

        @Test
        @DisplayName("Should dispatch MULTIPLE_CHOICE correctly")
        void shouldDispatchMultipleChoice() {
            Question q = buildQuestion(Question.QuestionType.MULTIPLE_CHOICE, null,
                    Map.of("correctOptions", List.of("A", "C")));
            var result = gradingService.grade(q, Map.of("selectedOptions", List.of("A", "C")), null);

            assertThat(result.correct()).isTrue();
        }

        @Test
        @DisplayName("Should dispatch TRUE_FALSE correctly")
        void shouldDispatchTrueFalse() {
            Question q = buildQuestion(Question.QuestionType.TRUE_FALSE, null,
                    Map.of("correctOption", "true"));
            var result = gradingService.grade(q, Map.of("selectedOption", "true"), null);

            assertThat(result.correct()).isTrue();
        }

        @Test
        @DisplayName("Should dispatch FILL_IN_BLANK correctly")
        void shouldDispatchFillInBlank() {
            Question q = buildQuestion(Question.QuestionType.FILL_IN_BLANK, null,
                    Map.of("acceptedAnswers", List.of("Paris")));
            var result = gradingService.grade(q, Map.of("textAnswer", "Paris"), null);

            assertThat(result.correct()).isTrue();
        }

        @Test
        @DisplayName("Should dispatch SHORT_ANSWER correctly")
        void shouldDispatchShortAnswer() {
            Question q = buildQuestion(Question.QuestionType.SHORT_ANSWER, null,
                    Map.of("acceptedAnswers", List.of("mitochondria")));
            var result = gradingService.grade(q, Map.of("textAnswer", "mitochondria"), null);

            assertThat(result.correct()).isTrue();
        }

        @Test
        @DisplayName("Should dispatch ESSAY correctly")
        void shouldDispatchEssay() {
            Question q = buildQuestion(Question.QuestionType.ESSAY, null, null);
            var result = gradingService.grade(q, Map.of("textAnswer", "Essay content"), null);

            assertThat(result.correct()).isFalse();
            assertThat(result.feedback()).contains("Chờ chấm điểm thủ công");
        }

        @Test
        @DisplayName("Should default to SINGLE_CHOICE when type is null")
        void shouldDefaultToSingleChoiceWhenNull() {
            Question q = buildQuestion(null, null, Map.of("correctOption", "A"));
            var result = gradingService.grade(q, Map.of("selectedOption", "A"), null);

            assertThat(result.correct()).isTrue();
        }
    }

    @Nested
    @DisplayName("Points Override Tests")
    class PointsOverrideTests {

        @Test
        @DisplayName("Should scale points when override provided")
        void shouldScalePoints() {
            Question q = buildQuestion(Question.QuestionType.SINGLE_CHOICE, null,
                    Map.of("correctOption", "A"));
            // Default maxPoints = 1.0, override to 5.0
            var result = gradingService.grade(q, Map.of("selectedOption", "A"), 5.0);

            assertThat(result.correct()).isTrue();
            assertThat(result.pointsEarned()).isEqualTo(5.0);
            assertThat(result.maxPoints()).isEqualTo(5.0);
        }

        @Test
        @DisplayName("Should return 0 points when wrong with override")
        void shouldReturn0WhenWrongWithOverride() {
            Question q = buildQuestion(Question.QuestionType.SINGLE_CHOICE, null,
                    Map.of("correctOption", "A"));
            var result = gradingService.grade(q, Map.of("selectedOption", "B"), 5.0);

            assertThat(result.correct()).isFalse();
            assertThat(result.pointsEarned()).isEqualTo(0.0);
            assertThat(result.maxPoints()).isEqualTo(5.0);
        }

        @Test
        @DisplayName("Should scale partial credit with override")
        void shouldScalePartialCreditWithOverride() {
            // MultipleChoice: correct A,C. Student selects A only → 0.5 * scale
            Question q = buildQuestion(Question.QuestionType.MULTIPLE_CHOICE, null,
                    Map.of("correctOptions", List.of("A", "C")));
            var result = gradingService.grade(q, Map.of("selectedOptions", List.of("A")), 10.0);

            assertThat(result.pointsEarned()).isCloseTo(5.0, within(0.01));
            assertThat(result.maxPoints()).isEqualTo(10.0);
        }

        @Test
        @DisplayName("Should not scale when override is null")
        void shouldNotScaleWhenNull() {
            Question q = buildQuestion(Question.QuestionType.SINGLE_CHOICE, null,
                    Map.of("correctOption", "A"));
            var result = gradingService.grade(q, Map.of("selectedOption", "A"), null);

            assertThat(result.pointsEarned()).isEqualTo(1.0);
            assertThat(result.maxPoints()).isEqualTo(1.0);
        }

        @Test
        @DisplayName("Should not scale when override is zero")
        void shouldNotScaleWhenZero() {
            Question q = buildQuestion(Question.QuestionType.SINGLE_CHOICE, null,
                    Map.of("correctOption", "A"));
            var result = gradingService.grade(q, Map.of("selectedOption", "A"), 0.0);

            // 0.0 is not > 0, so no scaling
            assertThat(result.pointsEarned()).isEqualTo(1.0);
        }
    }

    @Nested
    @DisplayName("GradeResult Value Object Tests")
    class GradeResultTests {

        @Test
        @DisplayName("correct() factory should set all fields")
        void correctFactory() {
            var r = GradingStrategy.GradeResult.correct(5.0);
            assertThat(r.correct()).isTrue();
            assertThat(r.pointsEarned()).isEqualTo(5.0);
            assertThat(r.maxPoints()).isEqualTo(5.0);
            assertThat(r.feedback()).isNull();
        }

        @Test
        @DisplayName("incorrect() factory should set zero points")
        void incorrectFactory() {
            var r = GradingStrategy.GradeResult.incorrect(3.0);
            assertThat(r.correct()).isFalse();
            assertThat(r.pointsEarned()).isEqualTo(0.0);
            assertThat(r.maxPoints()).isEqualTo(3.0);
        }

        @Test
        @DisplayName("partial() factory should set partial points")
        void partialFactory() {
            var r = GradingStrategy.GradeResult.partial(2.0, 5.0);
            assertThat(r.correct()).isFalse();
            assertThat(r.pointsEarned()).isEqualTo(2.0);
            assertThat(r.maxPoints()).isEqualTo(5.0);
        }

        @Test
        @DisplayName("pendingManualGrading() factory should set feedback")
        void pendingFactory() {
            var r = GradingStrategy.GradeResult.pendingManualGrading(10.0);
            assertThat(r.correct()).isFalse();
            assertThat(r.pointsEarned()).isEqualTo(0.0);
            assertThat(r.maxPoints()).isEqualTo(10.0);
            assertThat(r.feedback()).isNotNull();
        }
    }
}
