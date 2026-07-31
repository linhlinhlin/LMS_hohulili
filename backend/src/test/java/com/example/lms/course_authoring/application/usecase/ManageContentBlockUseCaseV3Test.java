package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.domain.repository.LessonRepositoryPort;
import com.example.lms.learning_delivery.infrastructure.persistence.ClassTeacherJpaRepository;
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
import org.springframework.security.access.AccessDeniedException;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ManageContentBlockUseCaseV3.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ManageContentBlockUseCaseV3 Tests")
class ManageContentBlockUseCaseV3Test {

    @Mock
    private LessonRepositoryPort lessonRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private CourseDraftMutationUseCase courseDraftMutationUseCase;

    @Mock
    private ClassTeacherJpaRepository classTeacherJpaRepository;

    @InjectMocks
    private ManageContentBlockUseCaseV3 useCase;

    private UUID lessonId;
    private UUID userId;
    private ContentBlock existingBlock;
    private List<ContentBlock> existingBlocks;

    @BeforeEach
    void setUp() {
        lessonId = UUID.randomUUID();
        userId = UUID.randomUUID();
        existingBlock = ContentBlock.of("block-1", "text", Map.of("text", "Hello"));
        existingBlocks = new ArrayList<>(List.of(existingBlock));
    }

    private void stubOwnershipCheck() {
        Course course = mock(Course.class);
        when(course.getTeacherId()).thenReturn(userId);
        when(courseRepository.findByLessonId(lessonId)).thenReturn(Optional.of(course));
    }

    @Nested
    @DisplayName("AddBlock Tests")
    class AddBlockTests {

        @Test
        @DisplayName("Should add block successfully")
        void shouldAddBlockSuccessfully() {
            // Given
            stubOwnershipCheck();
            when(lessonRepository.getContentBlocks(lessonId)).thenReturn(Optional.of(existingBlocks));

            Map<String, Object> data = Map.of("text", "New content");

            // When
            ContentBlock result = useCase.addBlock(lessonId, "text", data, userId, false);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getType()).isEqualTo("text");
            verify(lessonRepository).saveContentBlocks(eq(lessonId), any());
        }

        @Test
        @DisplayName("Should sanitize dangerous HTML before adding a block")
        void shouldSanitizeDangerousHtmlBeforeAddingBlock() {
            when(lessonRepository.getContentBlocks(lessonId)).thenReturn(Optional.of(existingBlocks));
            Map<String, Object> data = Map.of(
                    "html", "<p onclick=\"steal()\">Safe</p><script>alert(1)</script>",
                    "nested", Map.of("url", "javascript:alert(1)"));

            ContentBlock result = useCase.addBlock(lessonId, "text", data, userId, true);

            assertThat(result.getData().get("html").toString())
                    .isEqualTo("<p>Safe</p>");
            assertThat(((Map<?, ?>) result.getData().get("nested")).get("url"))
                    .isEqualTo("about:blank");
        }

        @Test
        @DisplayName("Should add block as admin without ownership")
        void shouldAddBlockAsAdmin() {
            UUID adminId = UUID.randomUUID();
            when(lessonRepository.getContentBlocks(lessonId)).thenReturn(Optional.of(existingBlocks));

            ContentBlock result = useCase.addBlock(lessonId, "text", Map.of("text", "Admin content"), adminId, true);

            assertThat(result).isNotNull();
            verify(lessonRepository).saveContentBlocks(eq(lessonId), any());
        }

        @Test
        @DisplayName("Should throw when lesson not found for addBlock")
        void shouldThrowWhenLessonNotFoundForAddBlock() {
            // Given - admin so no ownership check
            when(lessonRepository.getContentBlocks(lessonId)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> useCase.addBlock(lessonId, "text", Map.of(), userId, true))
                .isInstanceOf(EntityNotFoundException.class);
        }

        @Test
        @DisplayName("Should throw when not owner")
        void shouldThrowWhenNotOwner() {
            UUID otherUserId = UUID.randomUUID();
            Course course = mock(Course.class);
            when(course.getTeacherId()).thenReturn(userId);
            when(courseRepository.findByLessonId(lessonId)).thenReturn(Optional.of(course));

            assertThatThrownBy(() -> useCase.addBlock(lessonId, "text", Map.of(), otherUserId, false))
                .isInstanceOf(AccessDeniedException.class);
        }
    }

    @Nested
    @DisplayName("UpdateBlock Tests")
    class UpdateBlockTests {

        @Test
        @DisplayName("Should update block successfully")
        void shouldUpdateBlockSuccessfully() {
            // Given
            stubOwnershipCheck();
            when(lessonRepository.getContentBlocks(lessonId)).thenReturn(Optional.of(existingBlocks));

            Map<String, Object> newData = Map.of("text", "Updated content");

            // When
            ContentBlock result = useCase.updateBlock(lessonId, "block-1", newData, userId, false);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo("block-1");
            verify(lessonRepository).saveContentBlocks(eq(lessonId), any());
        }

        @Test
        @DisplayName("Should throw when block not found for update")
        void shouldThrowWhenBlockNotFoundForUpdate() {
            // Given
            stubOwnershipCheck();
            when(lessonRepository.getContentBlocks(lessonId)).thenReturn(Optional.of(existingBlocks));

            // When/Then
            assertThatThrownBy(() -> useCase.updateBlock(lessonId, "nonexistent-id", Map.of(), userId, false))
                .isInstanceOf(EntityNotFoundException.class);
        }

        @Test
        @DisplayName("Should throw when lesson not found for updateBlock")
        void shouldThrowWhenLessonNotFoundForUpdateBlock() {
            // Given - admin so no ownership check
            when(lessonRepository.getContentBlocks(lessonId)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> useCase.updateBlock(lessonId, "block-1", Map.of(), userId, true))
                .isInstanceOf(EntityNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("DeleteBlock Tests")
    class DeleteBlockTests {

        @Test
        @DisplayName("Should delete block successfully")
        void shouldDeleteBlockSuccessfully() {
            // Given
            stubOwnershipCheck();
            when(lessonRepository.getContentBlocks(lessonId)).thenReturn(Optional.of(existingBlocks));

            // When
            useCase.deleteBlock(lessonId, "block-1", userId, false);

            // Then
            verify(lessonRepository).saveContentBlocks(eq(lessonId), any());
        }

        @Test
        @DisplayName("Should throw when block not found for delete")
        void shouldThrowWhenBlockNotFoundForDelete() {
            // Given
            stubOwnershipCheck();
            when(lessonRepository.getContentBlocks(lessonId)).thenReturn(Optional.of(existingBlocks));

            // When/Then
            assertThatThrownBy(() -> useCase.deleteBlock(lessonId, "nonexistent-id", userId, false))
                .isInstanceOf(EntityNotFoundException.class);
        }
    }
}
