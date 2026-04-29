package com.example.lms.assessment.domain.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for Quiz aggregate root.
 */
@DisplayName("Quiz Domain Model Tests")
class QuizTest {

    private UUID lessonId;

    @BeforeEach
    void setUp() {
        lessonId = UUID.randomUUID();
    }

    @Nested
    @DisplayName("Factory Method Tests")
    class FactoryMethodTests {

        @Test
        @DisplayName("Should create quiz with defaults")
        void shouldCreateQuizWithDefaults() {
            // When
            Quiz quiz = Quiz.create(lessonId, "Quiz 1", "A quiz", null);

            // Then
            assertThat(quiz.getId()).isNotNull();
            assertThat(quiz.getLessonId()).isEqualTo(lessonId);
            assertThat(quiz.getTitle()).isEqualTo("Quiz 1");
            assertThat(quiz.getStatus()).isEqualTo(Quiz.QuizStatus.DRAFT);
            assertThat(quiz.getSettings()).isNotNull();
            assertThat(quiz.getSettings().timeLimitMinutes()).isEqualTo(30);
            assertThat(quiz.getQuestions()).isEmpty();
        }

        @Test
        @DisplayName("Should create quiz with custom settings")
        void shouldCreateQuizWithCustomSettings() {
            // Given
            Quiz.QuizSettings settings = Quiz.QuizSettings.builder()
                .timeLimitMinutes(60)
                .maxAttempts(5)
                .passingScore(80)
                .build();

            // When
            Quiz quiz = Quiz.create(lessonId, "Quiz 1", "desc", settings);

            // Then
            assertThat(quiz.getSettings().timeLimitMinutes()).isEqualTo(60);
            assertThat(quiz.getSettings().maxAttempts()).isEqualTo(5);
        }

        @Test
        @DisplayName("Should throw when lessonId is null")
        void shouldThrowWhenLessonIdIsNull() {
            assertThatThrownBy(() -> Quiz.create(null, "Quiz 1", "desc", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("bài học");
        }

        @Test
        @DisplayName("Should throw when title is blank")
        void shouldThrowWhenTitleIsBlank() {
            assertThatThrownBy(() -> Quiz.create(lessonId, "  ", "desc", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Tiêu đề");
        }

        @Test
        @DisplayName("Should throw when title is null")
        void shouldThrowWhenTitleIsNull() {
            assertThatThrownBy(() -> Quiz.create(lessonId, null, "desc", null))
                .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    @DisplayName("Lifecycle Tests")
    class LifecycleTests {

        @Test
        @DisplayName("Should publish DRAFT quiz with at least one question")
        void shouldPublishDraftQuiz() {
            // Given
            Quiz quiz = Quiz.create(lessonId, "Quiz 1", "desc", null);
            quiz.addQuestion(UUID.randomUUID(), 1);

            // When
            quiz.publish();

            // Then
            assertThat(quiz.getStatus()).isEqualTo(Quiz.QuizStatus.PUBLISHED);
            assertThat(quiz.isPublished()).isTrue();
        }

        @Test
        @DisplayName("Should throw publish when quiz has no questions")
        void shouldThrowPublishWhenEmpty() {
            // Given
            Quiz quiz = Quiz.create(lessonId, "Quiz 1", "desc", null);

            // When/Then
            assertThatThrownBy(quiz::publish)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ít nhất 1 câu hỏi");
        }

        @Test
        @DisplayName("Should throw publish when ARCHIVED")
        void shouldThrowPublishWhenArchived() {
            // Given
            Quiz quiz = Quiz.create(lessonId, "Quiz 1", "desc", null);
            quiz.archive();

            // When/Then
            assertThatThrownBy(quiz::publish)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("lưu trữ");
        }

        @Test
        @DisplayName("Should archive any quiz")
        void shouldArchiveAnyQuiz() {
            // Given
            Quiz quiz = Quiz.create(lessonId, "Quiz 1", "desc", null);
            quiz.addQuestion(UUID.randomUUID(), 1);
            quiz.publish();

            // When
            quiz.archive();

            // Then
            assertThat(quiz.getStatus()).isEqualTo(Quiz.QuizStatus.ARCHIVED);
        }
    }

    @Nested
    @DisplayName("Question Management Tests")
    class QuestionManagementTests {

        @Test
        @DisplayName("Should add question to DRAFT quiz")
        void shouldAddQuestionToDraftQuiz() {
            // Given
            Quiz quiz = Quiz.create(lessonId, "Quiz 1", "desc", null);
            UUID questionId = UUID.randomUUID();

            // When
            quiz.addQuestion(questionId, 1);

            // Then
            assertThat(quiz.getQuestions()).hasSize(1);
            assertThat(quiz.getQuestions().get(0).getQuestionId()).isEqualTo(questionId);
        }

        @Test
        @DisplayName("Should throw add question to PUBLISHED quiz")
        void shouldThrowAddQuestionToPublishedQuiz() {
            // Given
            Quiz quiz = Quiz.create(lessonId, "Quiz 1", "desc", null);
            quiz.addQuestion(UUID.randomUUID(), 1);
            quiz.publish();

            // When/Then
            assertThatThrownBy(() -> quiz.addQuestion(UUID.randomUUID(), 2))
                .isInstanceOf(IllegalStateException.class);
        }

        @Test
        @DisplayName("Should throw on duplicate question")
        void shouldThrowOnDuplicateQuestion() {
            // Given
            Quiz quiz = Quiz.create(lessonId, "Quiz 1", "desc", null);
            UUID questionId = UUID.randomUUID();
            quiz.addQuestion(questionId, 1);

            // When/Then
            assertThatThrownBy(() -> quiz.addQuestion(questionId, 2))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("đã tồn tại");
        }

        @Test
        @DisplayName("Should remove question from DRAFT quiz")
        void shouldRemoveQuestionFromDraftQuiz() {
            // Given
            Quiz quiz = Quiz.create(lessonId, "Quiz 1", "desc", null);
            UUID questionId = UUID.randomUUID();
            quiz.addQuestion(questionId, 1);

            // When
            quiz.removeQuestion(questionId);

            // Then
            assertThat(quiz.getQuestions()).isEmpty();
        }
    }

    @Nested
    @DisplayName("Query Method Tests")
    class QueryMethodTests {

        @Test
        @DisplayName("isEditable should be true only when DRAFT")
        void isEditableShouldBeTrueOnlyWhenDraft() {
            Quiz draft = Quiz.create(lessonId, "Quiz 1", "d", null);
            assertThat(draft.isEditable()).isTrue();

            draft.addQuestion(UUID.randomUUID(), 1);
            draft.publish();
            assertThat(draft.isEditable()).isFalse();
        }
    }
}
