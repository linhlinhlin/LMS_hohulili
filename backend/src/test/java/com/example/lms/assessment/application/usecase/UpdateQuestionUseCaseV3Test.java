package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Question;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.exception.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UpdateQuestionUseCaseV3.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UpdateQuestionUseCaseV3 Tests")
class UpdateQuestionUseCaseV3Test {

    @Mock
    private QuestionRepository questionRepository;

    @InjectMocks
    private UpdateQuestionUseCaseV3 useCase;

    private UUID questionId;
    private Question existingQuestion;

    @BeforeEach
    void setUp() {
        questionId = UUID.randomUUID();
        existingQuestion = Question.builder()
            .id(questionId)
            .contentBlocks(List.of(ContentBlock.create("text", Map.of("text", "Old question"))))
            .difficulty(Question.Difficulty.EASY)
            .status(Question.Status.DRAFT)
            .correctOption("A")
            .tags("math")
            .options(List.of())
            .build();
    }

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should update all fields")
        void shouldUpdateAllFields() {
            // Given
            when(questionRepository.findById(questionId)).thenReturn(Optional.of(existingQuestion));

            List<ContentBlock> newBlocks = List.of(ContentBlock.create("text", Map.of("text", "New question")));
            UpdateQuestionUseCaseV3.Command command = new UpdateQuestionUseCaseV3.Command(
                newBlocks, "B", Map.of("correctOption", "B"), null, List.of("Option A", "Option B"), Question.Difficulty.HARD, "science", Question.Status.ACTIVE
            );

            // When
            useCase.execute(questionId, command);

            // Then
            verify(questionRepository).save(existingQuestion);
            assertThat(existingQuestion.getDifficulty()).isEqualTo(Question.Difficulty.HARD);
            assertThat(existingQuestion.getTags()).isEqualTo("science");
            assertThat(existingQuestion.getStatus()).isEqualTo(Question.Status.ACTIVE);
            assertThat(existingQuestion.getCorrectOption()).isEqualTo("B");
        }

        @Test
        @DisplayName("Should replace options when provided")
        void shouldReplaceOptionsWhenProvided() {
            // Given
            when(questionRepository.findById(questionId)).thenReturn(Optional.of(existingQuestion));

            UpdateQuestionUseCaseV3.Command command = new UpdateQuestionUseCaseV3.Command(
                null, null, null, null, List.of("Opt A", "Opt B", "Opt C"), null, null, null
            );

            // When
            useCase.execute(questionId, command);

            // Then
            verify(questionRepository).save(existingQuestion);
            assertThat(existingQuestion.getOptions()).hasSize(3);
            assertThat(existingQuestion.getOptions().get(0).getKey()).isEqualTo("A");
            assertThat(existingQuestion.getOptions().get(2).getKey()).isEqualTo("C");
        }
    }

    @Nested
    @DisplayName("Error Tests")
    class ErrorTests {

        @Test
        @DisplayName("Should throw when question not found")
        void shouldThrowWhenQuestionNotFound() {
            // Given
            when(questionRepository.findById(questionId)).thenReturn(Optional.empty());

            UpdateQuestionUseCaseV3.Command command = new UpdateQuestionUseCaseV3.Command(
                null, null, null, null, null, null, null, null
            );

            // When/Then
            assertThatThrownBy(() -> useCase.execute(questionId, command))
                .isInstanceOf(EntityNotFoundException.class);
        }

        @Test
        @DisplayName("Should not replace options when list is null")
        void shouldNotReplaceOptionsWhenNull() {
            // Given
            when(questionRepository.findById(questionId)).thenReturn(Optional.of(existingQuestion));

            UpdateQuestionUseCaseV3.Command command = new UpdateQuestionUseCaseV3.Command(
                null, null, null, null, null, null, null, null
            );

            // When
            useCase.execute(questionId, command);

            // Then - options should remain empty (original)
            verify(questionRepository).save(existingQuestion);
        }
    }
}
