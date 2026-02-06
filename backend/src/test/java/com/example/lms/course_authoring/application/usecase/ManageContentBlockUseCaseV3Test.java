package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.repository.LessonRepositoryPort;
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

    @InjectMocks
    private ManageContentBlockUseCaseV3 useCase;

    private UUID lessonId;
    private ContentBlock existingBlock;
    private List<ContentBlock> existingBlocks;

    @BeforeEach
    void setUp() {
        lessonId = UUID.randomUUID();
        existingBlock = ContentBlock.of("block-1", "text", Map.of("text", "Hello"));
        existingBlocks = new ArrayList<>(List.of(existingBlock));
    }

    @Nested
    @DisplayName("AddBlock Tests")
    class AddBlockTests {

        @Test
        @DisplayName("Should add block successfully")
        void shouldAddBlockSuccessfully() {
            // Given
            when(lessonRepository.getContentBlocks(lessonId)).thenReturn(Optional.of(existingBlocks));

            Map<String, Object> data = Map.of("text", "New content");

            // When
            ContentBlock result = useCase.addBlock(lessonId, "text", data);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getType()).isEqualTo("text");
            verify(lessonRepository).saveContentBlocks(eq(lessonId), any());
        }

        @Test
        @DisplayName("Should throw when lesson not found for addBlock")
        void shouldThrowWhenLessonNotFoundForAddBlock() {
            // Given
            when(lessonRepository.getContentBlocks(lessonId)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> useCase.addBlock(lessonId, "text", Map.of()))
                .isInstanceOf(EntityNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("UpdateBlock Tests")
    class UpdateBlockTests {

        @Test
        @DisplayName("Should update block successfully")
        void shouldUpdateBlockSuccessfully() {
            // Given
            when(lessonRepository.getContentBlocks(lessonId)).thenReturn(Optional.of(existingBlocks));

            Map<String, Object> newData = Map.of("text", "Updated content");

            // When
            ContentBlock result = useCase.updateBlock(lessonId, "block-1", newData);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo("block-1");
            verify(lessonRepository).saveContentBlocks(eq(lessonId), any());
        }

        @Test
        @DisplayName("Should throw when block not found for update")
        void shouldThrowWhenBlockNotFoundForUpdate() {
            // Given
            when(lessonRepository.getContentBlocks(lessonId)).thenReturn(Optional.of(existingBlocks));

            // When/Then
            assertThatThrownBy(() -> useCase.updateBlock(lessonId, "nonexistent-id", Map.of()))
                .isInstanceOf(EntityNotFoundException.class);
        }

        @Test
        @DisplayName("Should throw when lesson not found for updateBlock")
        void shouldThrowWhenLessonNotFoundForUpdateBlock() {
            // Given
            when(lessonRepository.getContentBlocks(lessonId)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> useCase.updateBlock(lessonId, "block-1", Map.of()))
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
            when(lessonRepository.getContentBlocks(lessonId)).thenReturn(Optional.of(existingBlocks));

            // When
            useCase.deleteBlock(lessonId, "block-1");

            // Then
            verify(lessonRepository).saveContentBlocks(eq(lessonId), any());
        }

        @Test
        @DisplayName("Should throw when block not found for delete")
        void shouldThrowWhenBlockNotFoundForDelete() {
            // Given
            when(lessonRepository.getContentBlocks(lessonId)).thenReturn(Optional.of(existingBlocks));

            // When/Then
            assertThatThrownBy(() -> useCase.deleteBlock(lessonId, "nonexistent-id"))
                .isInstanceOf(EntityNotFoundException.class);
        }
    }
}
