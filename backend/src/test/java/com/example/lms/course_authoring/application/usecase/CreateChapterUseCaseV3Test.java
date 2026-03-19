package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.ChapterRepositoryPort;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
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

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private CourseDraftMutationUseCase courseDraftMutationUseCase;

    @InjectMocks
    private CreateChapterUseCaseV3 useCase;

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should create chapter when user is admin")
        void shouldCreateChapterWhenAdmin() {
            // Given
            UUID courseId = UUID.randomUUID();
            UUID adminId = UUID.randomUUID();
            UUID expectedChapterId = UUID.randomUUID();

            when(chapterRepository.save(courseId, "Chapter 1", "Introduction", 0))
                .thenReturn(expectedChapterId);

            var command = new CreateChapterUseCaseV3.CreateChapterCommand(
                courseId, "Chapter 1", "Introduction", 0, adminId, true);

            // When
            UUID result = useCase.execute(command);

            // Then
            assertThat(result).isEqualTo(expectedChapterId);
            verify(chapterRepository).save(courseId, "Chapter 1", "Introduction", 0);
            verify(courseRepository, never()).findById(any()); // Admin skips ownership check
        }

        @Test
        @DisplayName("Should create chapter when user is course owner")
        void shouldCreateChapterWhenOwner() {
            // Given
            UUID courseId = UUID.randomUUID();
            UUID teacherId = UUID.randomUUID();
            UUID expectedChapterId = UUID.randomUUID();

            Course course = mock(Course.class);
            when(course.getTeacherId()).thenReturn(teacherId);
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
            when(chapterRepository.save(courseId, "Advanced Topics", "Deep dive", 5))
                .thenReturn(expectedChapterId);

            var command = new CreateChapterUseCaseV3.CreateChapterCommand(
                courseId, "Advanced Topics", "Deep dive", 5, teacherId, false);

            // When
            UUID result = useCase.execute(command);

            // Then
            assertThat(result).isEqualTo(expectedChapterId);
            verify(chapterRepository).save(courseId, "Advanced Topics", "Deep dive", 5);
        }
    }

    @Nested
    @DisplayName("Ownership Verification Tests")
    class OwnershipTests {

        @Test
        @DisplayName("Should reject when non-owner teacher tries to add chapter")
        void shouldRejectNonOwnerTeacher() {
            // Given
            UUID courseId = UUID.randomUUID();
            UUID ownerId = UUID.randomUUID();
            UUID otherTeacherId = UUID.randomUUID();

            Course course = mock(Course.class);
            when(course.getTeacherId()).thenReturn(ownerId);
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));

            var command = new CreateChapterUseCaseV3.CreateChapterCommand(
                courseId, "Chapter 1", "Intro", 0, otherTeacherId, false);

            // When / Then
            assertThatThrownBy(() -> useCase.execute(command))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("quyền");
        }
    }
}
