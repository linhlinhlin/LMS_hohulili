package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Question;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.shared.infrastructure.service.FileManagementService;
import com.example.lms.shared.domain.model.ContentBlock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for CreateQuestionUseCaseV3.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("CreateQuestionUseCaseV3 Tests")
class CreateQuestionUseCaseV3Test {

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private FileManagementService fileManagementService;

    private CreateQuestionUseCaseV3 useCase;

    private UUID packageId;
    private UUID createdBy;

    @BeforeEach
    void setUp() {
        useCase = new CreateQuestionUseCaseV3(questionRepository, fileManagementService);
        packageId = UUID.randomUUID();
        createdBy = UUID.randomUUID();
    }

    private void stubRepositorySaveToReturnInput() {
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private List<ContentBlock> textBlock(String text) {
        return List.of(ContentBlock.create("text", Map.of("text", text)));
    }

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should create question with valid SINGLE_CHOICE data")
        void shouldCreateSingleChoiceQuestion() {
            // Given
            stubRepositorySaveToReturnInput();

            List<CreateQuestionUseCaseV3.OptionCommand> options = List.of(
                CreateQuestionUseCaseV3.OptionCommand.builder()
                    .key("A").contentBlocks(textBlock("Option A")).isCorrect(true).orderIndex(0).build(),
                CreateQuestionUseCaseV3.OptionCommand.builder()
                    .key("B").contentBlocks(textBlock("Option B")).isCorrect(false).orderIndex(1).build(),
                CreateQuestionUseCaseV3.OptionCommand.builder()
                    .key("C").contentBlocks(textBlock("Option C")).isCorrect(false).orderIndex(2).build(),
                CreateQuestionUseCaseV3.OptionCommand.builder()
                    .key("D").contentBlocks(textBlock("Option D")).isCorrect(false).orderIndex(3).build()
            );

            CreateQuestionUseCaseV3.Command command = CreateQuestionUseCaseV3.Command.builder()
                .contentBlocks(textBlock("What is 2+2?"))
                .difficulty(Question.Difficulty.EASY)
                .questionType(Question.QuestionType.SINGLE_CHOICE)
                .correctOption("A")
                .tags("math,arithmetic")
                .createdBy(createdBy)
                .packageId(packageId)
                .options(options)
                .build();

            // When
            UUID resultId = useCase.execute(command);

            // Then
            assertThat(resultId).isNotNull();

            ArgumentCaptor<Question> captor = ArgumentCaptor.forClass(Question.class);
            verify(questionRepository).save(captor.capture());

            Question saved = captor.getValue();
            assertThat(saved.getQuestionType()).isEqualTo(Question.QuestionType.SINGLE_CHOICE);
            assertThat(saved.getCorrectOption()).isEqualTo("A");
            assertThat(saved.getDifficulty()).isEqualTo(Question.Difficulty.EASY);
            assertThat(saved.getStatus()).isEqualTo(Question.Status.ACTIVE);
            assertThat(saved.getOptions()).hasSize(4);
        }

        @Test
        @DisplayName("Should create question with MULTIPLE_CHOICE type")
        void shouldCreateMultipleChoiceQuestion() {
            // Given
            stubRepositorySaveToReturnInput();

            Map<String, Object> answerKey = Map.of(
                "correctOptions", List.of("A", "C"),
                "partialCredit", true
            );

            List<CreateQuestionUseCaseV3.OptionCommand> options = List.of(
                CreateQuestionUseCaseV3.OptionCommand.builder()
                    .key("A").contentBlocks(textBlock("First correct")).isCorrect(true).orderIndex(0).build(),
                CreateQuestionUseCaseV3.OptionCommand.builder()
                    .key("B").contentBlocks(textBlock("Wrong")).isCorrect(false).orderIndex(1).build(),
                CreateQuestionUseCaseV3.OptionCommand.builder()
                    .key("C").contentBlocks(textBlock("Second correct")).isCorrect(true).orderIndex(2).build()
            );

            CreateQuestionUseCaseV3.Command command = CreateQuestionUseCaseV3.Command.builder()
                .contentBlocks(textBlock("Select all that apply"))
                .difficulty(Question.Difficulty.MEDIUM)
                .questionType(Question.QuestionType.MULTIPLE_CHOICE)
                .answerKey(answerKey)
                .createdBy(createdBy)
                .packageId(packageId)
                .options(options)
                .build();

            // When
            UUID resultId = useCase.execute(command);

            // Then
            assertThat(resultId).isNotNull();

            ArgumentCaptor<Question> captor = ArgumentCaptor.forClass(Question.class);
            verify(questionRepository).save(captor.capture());

            Question saved = captor.getValue();
            assertThat(saved.getQuestionType()).isEqualTo(Question.QuestionType.MULTIPLE_CHOICE);
            assertThat(saved.getAnswerKey()).containsKey("correctOptions");
            assertThat(saved.getOptions()).hasSize(3);
        }

        @Test
        @DisplayName("Should save question to repository and return generated ID")
        void shouldSaveToRepositoryAndReturnId() {
            // Given
            stubRepositorySaveToReturnInput();

            CreateQuestionUseCaseV3.Command command = CreateQuestionUseCaseV3.Command.builder()
                .contentBlocks(textBlock("Simple question"))
                .difficulty(Question.Difficulty.EASY)
                .questionType(Question.QuestionType.TRUE_FALSE)
                .correctOption("true")
                .createdBy(createdBy)
                .packageId(packageId)
                .build();

            // When
            UUID resultId = useCase.execute(command);

            // Then
            assertThat(resultId).isNotNull();
            verify(questionRepository, times(1)).save(any(Question.class));
            verify(fileManagementService).linkFilesToEntity(any(), eq(resultId), eq("QUESTION"));
        }

        @Test
        @DisplayName("Should create question with content blocks and link files")
        void shouldCreateQuestionWithContentBlocksAndLinkFiles() {
            // Given
            stubRepositorySaveToReturnInput();

            List<ContentBlock> blocks = List.of(
                ContentBlock.create("text", Map.of("text", "Look at the image below:")),
                ContentBlock.create("image", Map.of("url", "https://cdn.example.com/img.png")),
                ContentBlock.create("text", Map.of("text", "What does this represent?"))
            );

            CreateQuestionUseCaseV3.Command command = CreateQuestionUseCaseV3.Command.builder()
                .contentBlocks(blocks)
                .difficulty(Question.Difficulty.MEDIUM)
                .questionType(Question.QuestionType.SHORT_ANSWER)
                .createdBy(createdBy)
                .packageId(packageId)
                .build();

            // When
            UUID resultId = useCase.execute(command);

            // Then
            ArgumentCaptor<Question> captor = ArgumentCaptor.forClass(Question.class);
            verify(questionRepository).save(captor.capture());

            Question saved = captor.getValue();
            assertThat(saved.getContentBlocks()).hasSize(3);
            assertThat(saved.getContentBlocks().get(1).getType()).isEqualTo("image");

            // Verify file linking was called with the content blocks
            verify(fileManagementService).linkFilesToEntity(eq(blocks), eq(resultId), eq("QUESTION"));
        }

        @Test
        @DisplayName("Should create question with options and link option files")
        void shouldCreateQuestionWithOptionsAndLinkOptionFiles() {
            // Given
            stubRepositorySaveToReturnInput();

            List<ContentBlock> optABlocks = List.of(
                ContentBlock.create("image", Map.of("url", "https://cdn.example.com/optA.png"))
            );
            List<ContentBlock> optBBlocks = textBlock("Text option B");

            List<CreateQuestionUseCaseV3.OptionCommand> options = List.of(
                CreateQuestionUseCaseV3.OptionCommand.builder()
                    .key("A").contentBlocks(optABlocks).isCorrect(true).orderIndex(0).build(),
                CreateQuestionUseCaseV3.OptionCommand.builder()
                    .key("B").contentBlocks(optBBlocks).isCorrect(false).orderIndex(1).build()
            );

            CreateQuestionUseCaseV3.Command command = CreateQuestionUseCaseV3.Command.builder()
                .contentBlocks(textBlock("Which image is correct?"))
                .difficulty(Question.Difficulty.HARD)
                .questionType(Question.QuestionType.SINGLE_CHOICE)
                .correctOption("A")
                .createdBy(createdBy)
                .packageId(packageId)
                .options(options)
                .build();

            // When
            useCase.execute(command);

            // Then
            ArgumentCaptor<Question> captor = ArgumentCaptor.forClass(Question.class);
            verify(questionRepository).save(captor.capture());

            Question saved = captor.getValue();
            assertThat(saved.getOptions()).hasSize(2);
            assertThat(saved.getOptions().get(0).getKey()).isEqualTo("A");
            assertThat(saved.getOptions().get(1).getKey()).isEqualTo("B");

            // Verify file linking for each option
            verify(fileManagementService, times(3)).linkFilesToEntity(any(), any(UUID.class), anyString());
        }

        @Test
        @DisplayName("Should create question with tags")
        void shouldCreateQuestionWithTags() {
            // Given
            stubRepositorySaveToReturnInput();

            CreateQuestionUseCaseV3.Command command = CreateQuestionUseCaseV3.Command.builder()
                .contentBlocks(textBlock("Tagged question"))
                .difficulty(Question.Difficulty.EASY)
                .questionType(Question.QuestionType.FILL_IN_BLANK)
                .tags("navigation,safety,maritime-law")
                .createdBy(createdBy)
                .packageId(packageId)
                .build();

            // When
            useCase.execute(command);

            // Then
            ArgumentCaptor<Question> captor = ArgumentCaptor.forClass(Question.class);
            verify(questionRepository).save(captor.capture());

            Question saved = captor.getValue();
            assertThat(saved.getTags()).isEqualTo("navigation,safety,maritime-law");
            assertThat(saved.getTags()).contains("navigation");
            assertThat(saved.getTags()).contains("safety");
            assertThat(saved.getTags()).contains("maritime-law");
        }

        @Test
        @DisplayName("Should create questions with all difficulty levels")
        void shouldCreateQuestionWithDifficultyLevels() {
            // Given
            stubRepositorySaveToReturnInput();

            for (Question.Difficulty difficulty : Question.Difficulty.values()) {
                CreateQuestionUseCaseV3.Command command = CreateQuestionUseCaseV3.Command.builder()
                    .contentBlocks(textBlock("Question with " + difficulty.name() + " difficulty"))
                    .difficulty(difficulty)
                    .questionType(Question.QuestionType.ESSAY)
                    .createdBy(createdBy)
                    .packageId(packageId)
                    .build();

                // When
                useCase.execute(command);
            }

            // Then
            ArgumentCaptor<Question> captor = ArgumentCaptor.forClass(Question.class);
            verify(questionRepository, times(3)).save(captor.capture());

            List<Question> savedQuestions = captor.getAllValues();
            assertThat(savedQuestions).extracting(Question::getDifficulty)
                .containsExactly(Question.Difficulty.EASY, Question.Difficulty.MEDIUM, Question.Difficulty.HARD);
        }
    }

    @Nested
    @DisplayName("Edge Case Tests")
    class EdgeCaseTests {

        @Test
        @DisplayName("Should default to SINGLE_CHOICE when questionType is null")
        void shouldDefaultToSingleChoiceWhenTypeIsNull() {
            // Given
            stubRepositorySaveToReturnInput();

            CreateQuestionUseCaseV3.Command command = CreateQuestionUseCaseV3.Command.builder()
                .contentBlocks(textBlock("No type specified"))
                .difficulty(Question.Difficulty.EASY)
                .questionType(null)
                .correctOption("A")
                .createdBy(createdBy)
                .packageId(packageId)
                .build();

            // When
            UUID resultId = useCase.execute(command);

            // Then
            assertThat(resultId).isNotNull();

            ArgumentCaptor<Question> captor = ArgumentCaptor.forClass(Question.class);
            verify(questionRepository).save(captor.capture());

            Question saved = captor.getValue();
            assertThat(saved.getQuestionType()).isEqualTo(Question.QuestionType.SINGLE_CHOICE);
        }
    }
}
