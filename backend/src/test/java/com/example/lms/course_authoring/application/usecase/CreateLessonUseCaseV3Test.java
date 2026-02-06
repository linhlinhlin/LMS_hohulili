package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.repository.LessonRepositoryPort;
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
 * Unit tests for CreateLessonUseCaseV3.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("CreateLessonUseCaseV3 Tests")
class CreateLessonUseCaseV3Test {

    @Mock
    private LessonRepositoryPort lessonRepository;

    @InjectMocks
    private CreateLessonUseCaseV3 useCase;

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should create lesson and return ID")
        void shouldCreateLessonAndReturnId() {
            // Given
            UUID chapterId = UUID.randomUUID();
            UUID expectedLessonId = UUID.randomUUID();

            when(lessonRepository.save(chapterId, "Lesson 1", "Introduction to navigation",
                "LECTURE", null, 45, 0, true))
                .thenReturn(expectedLessonId);

            CreateLessonUseCaseV3.CreateLessonCommand command =
                new CreateLessonUseCaseV3.CreateLessonCommand(
                    chapterId, "Lesson 1", "Introduction to navigation",
                    "LECTURE", null, 45, 0, true
                );

            // When
            UUID result = useCase.execute(command);

            // Then
            assertThat(result).isEqualTo(expectedLessonId);
            verify(lessonRepository).save(chapterId, "Lesson 1", "Introduction to navigation",
                "LECTURE", null, 45, 0, true);
        }

        @Test
        @DisplayName("Should pass correct params including video URL")
        void shouldPassCorrectParamsIncludingVideoUrl() {
            // Given
            UUID chapterId = UUID.randomUUID();
            when(lessonRepository.save(any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(UUID.randomUUID());

            CreateLessonUseCaseV3.CreateLessonCommand command =
                new CreateLessonUseCaseV3.CreateLessonCommand(
                    chapterId, "Video Lesson", "A video lesson",
                    "VIDEO", "https://cdn.example.com/video.mp4", 30, 2, false
                );

            // When
            useCase.execute(command);

            // Then
            verify(lessonRepository).save(
                chapterId, "Video Lesson", "A video lesson",
                "VIDEO", "https://cdn.example.com/video.mp4", 30, 2, false
            );
        }
    }
}
