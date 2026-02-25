package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.UnauthorizedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Tests for DeleteCourseUseCase.
 *
 * Verifies:
 * - Owner can delete their own course
 * - EntityNotFoundException when course does not exist
 * - UnauthorizedException when caller is not the owner
 * - Correct course object passed to repository delete
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("DeleteCourseUseCase Tests")
class DeleteCourseUseCaseTest {

    @Mock
    private CourseRepository courseRepository;

    @InjectMocks
    private DeleteCourseUseCase useCase;

    private UUID courseId;
    private UUID teacherId;
    private Course course;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();
        teacherId = UUID.randomUUID();

        course = Course.create(
                CourseCode.of("DEL-001"),
                "Khóa học cần xóa",
                "Mô tả khóa học",
                teacherId
        );

        // Set course ID via reflection (BaseEntity generates random UUID)
        try {
            var idField = course.getClass().getSuperclass().getSuperclass().getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(course, courseId);
        } catch (Exception e) {
            // Ignore for test setup
        }
    }

    @Nested
    @DisplayName("Xóa thành công")
    class SuccessfulDeletion {

        @Test
        @DisplayName("Should delete course when caller is the owner")
        void shouldDeleteCourseWhenOwner() {
            // Given
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));

            // When
            assertThatCode(() -> useCase.execute(courseId, teacherId))
                    .doesNotThrowAnyException();

            // Then
            verify(courseRepository).delete(course);
        }

        @Test
        @DisplayName("Should call delete with correct course object")
        void shouldCallDeleteWithCorrectCourse() {
            // Given
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));

            // When
            useCase.execute(courseId, teacherId);

            // Then
            verify(courseRepository, times(1)).delete(course);
            verify(courseRepository, never()).deleteById(any());
        }
    }

    @Nested
    @DisplayName("Khóa học không tồn tại")
    class CourseNotFound {

        @Test
        @DisplayName("Should throw EntityNotFoundException when course does not exist")
        void shouldThrowEntityNotFoundWhenCourseNotFound() {
            // Given
            UUID nonExistentId = UUID.randomUUID();
            when(courseRepository.findById(nonExistentId)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> useCase.execute(nonExistentId, teacherId))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("Không tìm thấy")
                    .hasMessageContaining("Khóa học");

            verify(courseRepository, never()).delete(any());
        }
    }

    @Nested
    @DisplayName("Không có quyền xóa")
    class UnauthorizedDeletion {

        @Test
        @DisplayName("Should throw UnauthorizedException when caller is not the owner")
        void shouldThrowUnauthorizedWhenNotOwner() {
            // Given
            UUID otherUserId = UUID.randomUUID();
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));

            // When/Then
            assertThatThrownBy(() -> useCase.execute(courseId, otherUserId))
                    .isInstanceOf(UnauthorizedException.class)
                    .hasMessageContaining("Bạn không có quyền")
                    .hasMessageContaining("xóa");

            verify(courseRepository, never()).delete(any());
        }

        @Test
        @DisplayName("Should throw UnauthorizedException when non-owner and isAdmin=false")
        void shouldThrowUnauthorizedWhenNotOwnerAndNotAdmin() {
            // Given
            UUID otherUserId = UUID.randomUUID();
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));

            // When/Then
            assertThatThrownBy(() -> useCase.execute(courseId, otherUserId, false))
                    .isInstanceOf(UnauthorizedException.class)
                    .hasMessageContaining("xóa");

            verify(courseRepository, never()).delete(any());
        }
    }

    @Nested
    @DisplayName("Admin bỏ qua sở hữu")
    class AdminBypass {

        @Test
        @DisplayName("Admin can delete any course via isAdmin flag")
        void adminCanDeleteAnyCourse() {
            // Given
            UUID adminUserId = UUID.randomUUID(); // Not the owner
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));

            // When
            assertThatCode(() -> useCase.execute(courseId, adminUserId, true))
                    .doesNotThrowAnyException();

            // Then
            verify(courseRepository).delete(course);
        }
    }
}
