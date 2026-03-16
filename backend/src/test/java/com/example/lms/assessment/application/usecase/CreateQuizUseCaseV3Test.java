package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Quiz;
import com.example.lms.assessment.domain.model.QuizId;
import com.example.lms.assessment.domain.repository.QuizRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for CreateQuizUseCaseV3.
 * Updated to use domain models instead of JPA entities.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("CreateQuizUseCaseV3 Tests")
class CreateQuizUseCaseV3Test {

    @Mock
    private QuizRepository quizRepository;

    @InjectMocks
    private CreateQuizUseCaseV3 useCase;

    @Captor
    private ArgumentCaptor<Quiz> quizCaptor;

    private CreateQuizUseCaseV3.CreateQuizCommand validCommand;
    private UUID lessonId;
    private UUID quizId;

    @BeforeEach
    void setUp() {
        lessonId = UUID.randomUUID();
        quizId = UUID.randomUUID();
        
        validCommand = new CreateQuizUseCaseV3.CreateQuizCommand(
            lessonId,
            "Maritime Safety Quiz",
            "Test your knowledge on maritime safety",
            30,  // 30 minutes
            70,  // 70% passing score
            true,
            true,
            Quiz.AssessmentType.PRACTICE,
            false
        );
    }

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should create quiz successfully")
        void shouldCreateQuizSuccessfully() {
            // Given - Create mock Quiz returned by save
            Quiz savedQuiz = Quiz.create(
                lessonId,
                "Maritime Safety Quiz",
                "Test your knowledge",
                Quiz.QuizSettings.defaults()
            );
            when(quizRepository.findByLessonId(lessonId)).thenReturn(java.util.List.of());
            when(quizRepository.save(any(Quiz.class))).thenReturn(savedQuiz);

            // When
            UUID resultId = useCase.execute(validCommand);

            // Then
            assertThat(resultId).isNotNull();
            verify(quizRepository).save(any(Quiz.class));
        }

        @Test
        @DisplayName("Should create quiz with correct settings")
        void shouldCreateQuizWithCorrectSettings() {
            // Given
            Quiz savedQuiz = Quiz.create(
                lessonId,
                "Maritime Safety Quiz",
                "Test",
                Quiz.QuizSettings.defaults()
            );
            when(quizRepository.findByLessonId(lessonId)).thenReturn(java.util.List.of());
            when(quizRepository.save(quizCaptor.capture())).thenReturn(savedQuiz);

            // When
            useCase.execute(validCommand);

            // Then
            Quiz captured = quizCaptor.getValue();
            assertThat(captured.getLessonId()).isEqualTo(lessonId);
            assertThat(captured.getTitle()).isEqualTo("Maritime Safety Quiz");
            assertThat(captured.getDescription()).isEqualTo("Test your knowledge on maritime safety");
            assertThat(captured.getSettings().timeLimitMinutes()).isEqualTo(30);
            assertThat(captured.getSettings().passingScore()).isEqualTo(70);
            assertThat(captured.getSettings().shuffleQuestions()).isTrue();
            assertThat(captured.getSettings().showResultsImmediately()).isTrue();
            assertThat(captured.getAssessmentType()).isEqualTo(Quiz.AssessmentType.PRACTICE);
            assertThat(captured.isCountsTowardCertificate()).isFalse();
        }

        @Test
        @DisplayName("Should return saved quiz ID")
        void shouldReturnSavedQuizId() {
            // Given
            Quiz savedQuiz = Quiz.create(lessonId, "Quiz", null, null);
            when(quizRepository.findByLessonId(lessonId)).thenReturn(java.util.List.of());
            when(quizRepository.save(any(Quiz.class))).thenReturn(savedQuiz);

            // When
            UUID resultId = useCase.execute(validCommand);

            // Then
            assertThat(resultId).isNotNull();
            assertThat(resultId).isEqualTo(savedQuiz.getId().value());
        }
    }

    @Nested
    @DisplayName("Edge Cases")
    class EdgeCaseTests {

        @Test
        @DisplayName("Should reject duplicate quiz for the same lesson")
        void shouldRejectDuplicateQuizForSameLesson() {
            Quiz existingQuiz = Quiz.create(lessonId, "Existing Quiz", null, null);
            when(quizRepository.findByLessonId(lessonId)).thenReturn(java.util.List.of(existingQuiz));

            assertThatThrownBy(() -> useCase.execute(validCommand))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Bai hoc nay da co bai kiem tra");

            verify(quizRepository, never()).save(any(Quiz.class));
        }

        @Test
        @DisplayName("Should handle null optional fields with defaults")
        void shouldHandleNullOptionalFields() {
            // Given
            CreateQuizUseCaseV3.CreateQuizCommand minimalCommand = 
                new CreateQuizUseCaseV3.CreateQuizCommand(
                    lessonId, "Basic Quiz", null, null, null, null, null, null, null
                );
            Quiz savedQuiz = Quiz.create(lessonId, "Basic Quiz", null, null);
            when(quizRepository.findByLessonId(lessonId)).thenReturn(java.util.List.of());
            when(quizRepository.save(any(Quiz.class))).thenReturn(savedQuiz);

            // When
            UUID resultId = useCase.execute(minimalCommand);

            // Then
            assertThat(resultId).isNotNull();
            verify(quizRepository).save(any(Quiz.class));
        }
    }
}
