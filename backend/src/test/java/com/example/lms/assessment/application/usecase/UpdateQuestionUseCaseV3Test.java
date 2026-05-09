package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Question;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.shared.application.port.FileManagementPort;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.exception.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UpdateQuestionUseCaseV3.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UpdateQuestionUseCaseV3 Tests")
class UpdateQuestionUseCaseV3Test {

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private FileManagementPort fileManagementService;

    private UpdateQuestionUseCaseV3 useCase;

    private UUID questionId;
    private Question existingQuestion;

    @BeforeEach
    void setUp() {
        useCase = new UpdateQuestionUseCaseV3(questionRepository, fileManagementService);
        lenient().when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));
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
                newBlocks, "B", Map.of("correctOption", "B"), null, List.of("Option A", "Option B"), null, Question.Difficulty.HARD, "science", Question.Status.ACTIVE, null
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
                null, null, null, null, List.of("Opt A", "Opt B", "Opt C"), null, null, null, null, null
            );

            // When
            useCase.execute(questionId, command);

            // Then
            verify(questionRepository).save(existingQuestion);
            assertThat(existingQuestion.getOptions()).hasSize(3);
            assertThat(existingQuestion.getOptions().get(0).getKey()).isEqualTo("A");
            assertThat(existingQuestion.getOptions().get(2).getKey()).isEqualTo("C");
        }

        @Test
        @DisplayName("Should replace options with rich content blocks when option commands are provided")
        void shouldReplaceOptionsWithRichContentBlocksWhenOptionCommandsProvided() {
            when(questionRepository.findById(questionId)).thenReturn(Optional.of(existingQuestion));
            when(questionRepository.save(existingQuestion)).thenReturn(existingQuestion);

            List<ContentBlock> imageBlocks = List.of(
                ContentBlock.create("image", Map.of("url", "https://cdn.example.com/option-a.png"))
            );
            List<ContentBlock> formulaBlocks = List.of(
                ContentBlock.create("formula", Map.of("latex", "x^2", "format", "inline"))
            );

            UpdateQuestionUseCaseV3.Command command = new UpdateQuestionUseCaseV3.Command(
                null,
                "A",
                Map.of("correctOption", "A"),
                null,
                null,
                List.of(
                    new UpdateQuestionUseCaseV3.OptionCommand(imageBlocks, 0, "A"),
                    new UpdateQuestionUseCaseV3.OptionCommand(formulaBlocks, 1, "B")
                ),
                null,
                null,
                null,
                null
            );

            useCase.execute(questionId, command);

            verify(questionRepository).save(existingQuestion);
            assertThat(existingQuestion.getOptions()).hasSize(2);
            assertThat(existingQuestion.getOptions().get(0).getContentBlocks()).isEqualTo(imageBlocks);
            assertThat(existingQuestion.getOptions().get(1).getContentBlocks()).isEqualTo(formulaBlocks);
            verify(fileManagementService).linkFilesToEntity(imageBlocks, existingQuestion.getOptions().get(0).getId(), "QUESTION_OPTION");
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
                null, null, null, null, null, null, null, null, null, null
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
                null, null, null, null, null, null, null, null, null, null
            );

            // When
            useCase.execute(questionId, command);

            // Then - options should remain empty (original)
            verify(questionRepository).save(existingQuestion);
        }
    }
}
