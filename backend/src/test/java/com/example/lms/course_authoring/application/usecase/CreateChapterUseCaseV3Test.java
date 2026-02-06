package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.repository.ChapterRepositoryPort;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for CreateChapterUseCaseV3.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("CreateChapterUseCaseV3 Tests")
class CreateChapterUseCaseV3Test {

    @Mock
    private ChapterRepositoryPort chapterRepository;

    @InjectMocks
    private CreateChapterUseCaseV3 useCase;

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should create chapter and return ID")
        void shouldCreateChapterAndReturnId() {
            // Given
            UUID courseId = UUID.randomUUID();
            UUID expectedChapterId = UUID.randomUUID();

            when(chapterRepository.save(courseId, "Chapter 1", "Introduction", 0))
                .thenReturn(expectedChapterId);

            CreateChapterUseCaseV3.CreateChapterCommand command =
                new CreateChapterUseCaseV3.CreateChapterCommand(courseId, "Chapter 1", "Introduction", 0);

            // When
            UUID result = useCase.execute(command);

            // Then
            assertThat(result).isEqualTo(expectedChapterId);
            verify(chapterRepository).save(courseId, "Chapter 1", "Introduction", 0);
        }

        @Test
        @DisplayName("Should pass correct params to repository")
        void shouldPassCorrectParamsToRepository() {
            // Given
            UUID courseId = UUID.randomUUID();
            when(chapterRepository.save(any(), any(), any(), any())).thenReturn(UUID.randomUUID());

            CreateChapterUseCaseV3.CreateChapterCommand command =
                new CreateChapterUseCaseV3.CreateChapterCommand(courseId, "Advanced Topics", "Deep dive", 5);

            // When
            useCase.execute(command);

            // Then
            verify(chapterRepository).save(courseId, "Advanced Topics", "Deep dive", 5);
        }
    }
}
