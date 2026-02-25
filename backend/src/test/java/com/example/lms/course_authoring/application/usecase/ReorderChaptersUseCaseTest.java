package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.CourseResponse;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.UnauthorizedException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Tests for ReorderChaptersUseCase.
 *
 * Verifies:
 * - Successful chapter reorder
 * - EntityNotFoundException for non-existent course
 * - UnauthorizedException for non-owner
 * - Domain reorderChapters called with correct IDs
 * - Course saved after reorder
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ReorderChaptersUseCase")
class ReorderChaptersUseCaseTest {

    @Mock
    private CourseRepository courseRepository;

    @InjectMocks
    private ReorderChaptersUseCase useCase;

    private final UUID courseId = UUID.randomUUID();
    private final UUID teacherId = UUID.randomUUID();

    @Nested
    @DisplayName("Successful reorder")
    class SuccessfulReorder {

        @Test
        @DisplayName("Should reorder chapters successfully and return CourseResponse")
        void shouldReorderSuccessfully() {
            var course = mock(Course.class);
            when(course.isOwnedBy(teacherId)).thenReturn(true);
            when(courseRepository.findByIdWithContent(courseId)).thenReturn(Optional.of(course));
            when(courseRepository.save(course)).thenReturn(course);

            // Stub the methods CourseResponse.from() needs
            stubCourseForResponse(course);

            List<UUID> chapterIds = List.of(UUID.randomUUID(), UUID.randomUUID());
            CourseResponse result = useCase.execute(courseId, teacherId, chapterIds);

            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("Should call reorderChapters with correct chapter IDs")
        void shouldCallReorderWithCorrectIds() {
            var course = mock(Course.class);
            when(course.isOwnedBy(teacherId)).thenReturn(true);
            when(courseRepository.findByIdWithContent(courseId)).thenReturn(Optional.of(course));
            when(courseRepository.save(course)).thenReturn(course);

            stubCourseForResponse(course);

            List<UUID> chapterIds = List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
            useCase.execute(courseId, teacherId, chapterIds);

            verify(course).reorderChapters(chapterIds);
        }

        @Test
        @DisplayName("Should save course after reorder")
        void shouldSaveCourseAfterReorder() {
            var course = mock(Course.class);
            when(course.isOwnedBy(teacherId)).thenReturn(true);
            when(courseRepository.findByIdWithContent(courseId)).thenReturn(Optional.of(course));
            when(courseRepository.save(course)).thenReturn(course);

            stubCourseForResponse(course);

            List<UUID> chapterIds = List.of(UUID.randomUUID());
            useCase.execute(courseId, teacherId, chapterIds);

            var inOrder = inOrder(course, courseRepository);
            inOrder.verify(course).reorderChapters(chapterIds);
            inOrder.verify(courseRepository).save(course);
        }
    }

    @Nested
    @DisplayName("Error cases")
    class ErrorCases {

        @Test
        @DisplayName("Should throw EntityNotFoundException for non-existent course")
        void shouldThrowForNonExistentCourse() {
            when(courseRepository.findByIdWithContent(courseId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> useCase.execute(courseId, teacherId, List.of()))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("Không tìm thấy")
                    .hasMessageContaining("Khóa học");
        }

        @Test
        @DisplayName("Should throw UnauthorizedException for non-owner")
        void shouldThrowForNonOwner() {
            var course = mock(Course.class);
            UUID otherUserId = UUID.randomUUID();
            when(course.isOwnedBy(otherUserId)).thenReturn(false);
            when(courseRepository.findByIdWithContent(courseId)).thenReturn(Optional.of(course));

            assertThatThrownBy(() -> useCase.execute(courseId, otherUserId, List.of()))
                    .isInstanceOf(UnauthorizedException.class)
                    .hasMessageContaining("Bạn không có quyền");
        }
    }

    /**
     * Stub the minimum getters on a mock Course so that CourseResponse.from() works.
     */
    private void stubCourseForResponse(Course course) {
        when(course.getId()).thenReturn(courseId);
        when(course.getTitle()).thenReturn("Test Course");
        when(course.getStatus()).thenReturn(Course.CourseStatus.DRAFT);
        when(course.getTeacherId()).thenReturn(teacherId);
        when(course.getTags()).thenReturn(java.util.Set.of());
        when(course.getChapters()).thenReturn(java.util.Set.of());
    }
}
