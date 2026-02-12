package com.example.lms.assessment.domain.model;

import com.example.lms.shared.domain.model.ContentBlock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for Question domain model.
 */
@DisplayName("Question Domain Model Tests")
class QuestionTest {

    private Question question;

    @BeforeEach
    void setUp() {
        question = Question.builder()
            .id(UUID.randomUUID())
            .contentBlocks(List.of(ContentBlock.create("text", Map.of("text", "What is 2+2?"))))
            .difficulty(Question.Difficulty.EASY)
            .status(Question.Status.DRAFT)
            .correctOption("A")
            .tags("math")
            .options(List.of(
                Question.QuestionOption.create("A", List.of(ContentBlock.create("text", Map.of("text", "4"))), 0),
                Question.QuestionOption.create("B", List.of(ContentBlock.create("text", Map.of("text", "5"))), 1)
            ))
            .build();
    }

    @Nested
    @DisplayName("Domain Behavior Tests")
    class DomainBehaviorTests {

        @Test
        @DisplayName("Should update content blocks")
        void shouldUpdateContentBlocks() {
            // Given
            List<ContentBlock> newBlocks = List.of(ContentBlock.create("text", Map.of("text", "New question")));

            // When
            question.updateContentBlocks(newBlocks);

            // Then
            assertThat(question.getContentBlocks()).hasSize(1);
            assertThat(question.getContentBlocks().get(0).getData().get("text")).isEqualTo("New question");
            assertThat(question.getUpdatedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should not update content blocks when null")
        void shouldNotUpdateContentBlocksWhenNull() {
            // Given
            List<ContentBlock> original = question.getContentBlocks();

            // When
            question.updateContentBlocks(null);

            // Then
            assertThat(question.getContentBlocks()).isEqualTo(original);
        }

        @Test
        @DisplayName("Should update difficulty")
        void shouldUpdateDifficulty() {
            question.updateDifficulty(Question.Difficulty.HARD);
            assertThat(question.getDifficulty()).isEqualTo(Question.Difficulty.HARD);
        }

        @Test
        @DisplayName("Should replace options")
        void shouldReplaceOptions() {
            // Given
            List<Question.QuestionOption> newOptions = List.of(
                Question.QuestionOption.create("A", List.of(ContentBlock.create("text", Map.of("text", "True"))), 0),
                Question.QuestionOption.create("B", List.of(ContentBlock.create("text", Map.of("text", "False"))), 1),
                Question.QuestionOption.create("C", List.of(ContentBlock.create("text", Map.of("text", "Maybe"))), 2)
            );

            // When
            question.replaceOptions(newOptions);

            // Then
            assertThat(question.getOptions()).hasSize(3);
            assertThat(question.getOptions().get(2).getKey()).isEqualTo("C");
        }

        @Test
        @DisplayName("Should update tags")
        void shouldUpdateTags() {
            question.updateTags("science,physics");
            assertThat(question.getTags()).isEqualTo("science,physics");
        }

        @Test
        @DisplayName("Should update status")
        void shouldUpdateStatus() {
            question.updateStatus(Question.Status.ACTIVE);
            assertThat(question.getStatus()).isEqualTo(Question.Status.ACTIVE);
        }

        @Test
        @DisplayName("Should update correct option")
        void shouldUpdateCorrectOption() {
            question.updateCorrectOption("C");
            assertThat(question.getCorrectOption()).isEqualTo("C");
        }
    }

    @Nested
    @DisplayName("QuestionType Tests")
    class QuestionTypeTests {

        @Test
        @DisplayName("Should default to SINGLE_CHOICE when null")
        void shouldDefaultToSingleChoice() {
            Question q = Question.builder()
                    .id(UUID.randomUUID())
                    .status(Question.Status.DRAFT)
                    .build();

            assertThat(q.getQuestionType()).isEqualTo(Question.QuestionType.SINGLE_CHOICE);
        }

        @Test
        @DisplayName("Should set questionType via builder")
        void shouldSetQuestionTypeViaBuilder() {
            Question q = Question.builder()
                    .id(UUID.randomUUID())
                    .questionType(Question.QuestionType.ESSAY)
                    .build();

            assertThat(q.getQuestionType()).isEqualTo(Question.QuestionType.ESSAY);
        }

        @Test
        @DisplayName("Should update questionType")
        void shouldUpdateQuestionType() {
            question.updateQuestionType(Question.QuestionType.TRUE_FALSE);
            assertThat(question.getQuestionType()).isEqualTo(Question.QuestionType.TRUE_FALSE);
            assertThat(question.getUpdatedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should not update questionType when null")
        void shouldNotUpdateQuestionTypeWhenNull() {
            question.updateQuestionType(Question.QuestionType.MULTIPLE_CHOICE);
            question.updateQuestionType(null);
            assertThat(question.getQuestionType()).isEqualTo(Question.QuestionType.MULTIPLE_CHOICE);
        }

        @Test
        @DisplayName("All 6 QuestionType values should exist")
        void allQuestionTypesShouldExist() {
            assertThat(Question.QuestionType.values()).hasSize(6);
            assertThat(Question.QuestionType.values()).containsExactly(
                    Question.QuestionType.SINGLE_CHOICE,
                    Question.QuestionType.MULTIPLE_CHOICE,
                    Question.QuestionType.TRUE_FALSE,
                    Question.QuestionType.FILL_IN_BLANK,
                    Question.QuestionType.SHORT_ANSWER,
                    Question.QuestionType.ESSAY
            );
        }
    }

    @Nested
    @DisplayName("AnswerKey Tests")
    class AnswerKeyTests {

        @Test
        @DisplayName("Should set answerKey via builder")
        void shouldSetAnswerKeyViaBuilder() {
            Map<String, Object> key = Map.of("correctOption", "B");
            Question q = Question.builder()
                    .id(UUID.randomUUID())
                    .answerKey(key)
                    .build();

            assertThat(q.getAnswerKey()).isEqualTo(key);
        }

        @Test
        @DisplayName("Should update answerKey")
        void shouldUpdateAnswerKey() {
            Map<String, Object> key = Map.of("acceptedAnswers", List.of("Paris", "paris"));
            question.updateAnswerKey(key);
            assertThat(question.getAnswerKey()).isEqualTo(key);
            assertThat(question.getUpdatedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should not update answerKey when null")
        void shouldNotUpdateAnswerKeyWhenNull() {
            Map<String, Object> key = Map.of("correctOption", "A");
            question.updateAnswerKey(key);
            question.updateAnswerKey(null);
            assertThat(question.getAnswerKey()).isEqualTo(key);
        }

        @Test
        @DisplayName("Should support complex answerKey for multiple choice")
        void shouldSupportComplexAnswerKey() {
            Map<String, Object> key = Map.of(
                    "correctOptions", List.of("A", "C"),
                    "partialCredit", true
            );
            question.updateAnswerKey(key);
            assertThat(question.getAnswerKey()).containsKey("correctOptions");
            assertThat(question.getAnswerKey()).containsKey("partialCredit");
        }

        @Test
        @DisplayName("Should support fill-in-blank answerKey with multiple accepted answers")
        void shouldSupportFillInBlankAnswerKey() {
            Map<String, Object> key = Map.of(
                    "acceptedAnswers", List.of("4", "four", "Four"),
                    "caseSensitive", false
            );
            question.updateAnswerKey(key);
            assertThat(question.getAnswerKey().get("acceptedAnswers")).isInstanceOf(List.class);
        }
    }
}
