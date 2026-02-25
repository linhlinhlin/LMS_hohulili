package com.example.lms.learning_delivery.domain.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for Note domain model.
 */
@DisplayName("Note Domain Model Tests")
class NoteTest {

    private UUID userId;
    private UUID courseId;
    private UUID lessonId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        courseId = UUID.randomUUID();
        lessonId = UUID.randomUUID();
    }

    @Nested
    @DisplayName("Creation Tests")
    class CreationTests {

        @Test
        @DisplayName("Should create note with correct fields")
        void shouldCreateNoteWithCorrectFields() {
            // Given
            String title = "Navigation Basics";
            String content = "Key points about maritime navigation";
            List<String> tags = List.of("navigation", "basics");

            // When
            Note note = Note.create(userId, courseId, lessonId, title, content, tags);

            // Then
            assertThat(note.getId()).isNotNull();
            assertThat(note.getUserId()).isEqualTo(userId);
            assertThat(note.getCourseId()).isEqualTo(courseId);
            assertThat(note.getLessonId()).isEqualTo(lessonId);
            assertThat(note.getTitle()).isEqualTo(title);
            assertThat(note.getContent()).isEqualTo(content);
            assertThat(note.getTags()).containsExactly("navigation", "basics");
            assertThat(note.isPublic()).isFalse();
            assertThat(note.getCreatedAt()).isNotNull();
            assertThat(note.getUpdatedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should create note with null lessonId")
        void shouldCreateNoteWithNullLessonId() {
            // When
            Note note = Note.create(userId, courseId, null, "General Note", "Some content", null);

            // Then
            assertThat(note.getLessonId()).isNull();
            assertThat(note.getTitle()).isEqualTo("General Note");
            assertThat(note.getContent()).isEqualTo("Some content");
            assertThat(note.getTags()).isEmpty();
        }

        @Test
        @DisplayName("Should default content to empty string when null")
        void shouldDefaultContentToEmptyString() {
            // When
            Note note = Note.create(userId, courseId, lessonId, "Title", null, null);

            // Then
            assertThat(note.getContent()).isEmpty();
        }

        @Test
        @DisplayName("Should throw when title is blank")
        void shouldThrowWhenTitleIsBlank() {
            assertThatThrownBy(() -> Note.create(userId, courseId, lessonId, "  ", "content", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Tiêu đề ghi chú không được để trống");
        }

        @Test
        @DisplayName("Should throw when title is null")
        void shouldThrowWhenTitleIsNull() {
            assertThatThrownBy(() -> Note.create(userId, courseId, lessonId, null, "content", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Tiêu đề ghi chú không được để trống");
        }

        @Test
        @DisplayName("Should throw when userId is null")
        void shouldThrowWhenUserIdIsNull() {
            assertThatThrownBy(() -> Note.create(null, courseId, lessonId, "Title", "content", null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Mã người dùng không được để trống");
        }

        @Test
        @DisplayName("Should throw when courseId is null")
        void shouldThrowWhenCourseIdIsNull() {
            assertThatThrownBy(() -> Note.create(userId, null, lessonId, "Title", "content", null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Mã khóa học không được để trống");
        }
    }

    @Nested
    @DisplayName("Update Tests")
    class UpdateTests {

        @Test
        @DisplayName("Should update title, content, and tags")
        void shouldUpdateFields() {
            // Given
            Note note = Note.create(userId, courseId, lessonId, "Original Title", "Original Content",
                List.of("old-tag"));
            Instant createdAt = note.getCreatedAt();

            // When
            note.update("New Title", "New Content", List.of("new-tag-1", "new-tag-2"));

            // Then
            assertThat(note.getTitle()).isEqualTo("New Title");
            assertThat(note.getContent()).isEqualTo("New Content");
            assertThat(note.getTags()).containsExactly("new-tag-1", "new-tag-2");
            assertThat(note.getUpdatedAt()).isAfterOrEqualTo(createdAt);
        }

        @Test
        @DisplayName("Should keep title when update title is null")
        void shouldKeepTitleWhenUpdateTitleIsNull() {
            // Given
            Note note = Note.create(userId, courseId, lessonId, "Original Title", "Content", null);

            // When
            note.update(null, "Updated Content", null);

            // Then
            assertThat(note.getTitle()).isEqualTo("Original Title");
            assertThat(note.getContent()).isEqualTo("Updated Content");
        }

        @Test
        @DisplayName("Should keep title when update title is blank")
        void shouldKeepTitleWhenUpdateTitleIsBlank() {
            // Given
            Note note = Note.create(userId, courseId, lessonId, "Original Title", "Content", null);

            // When
            note.update("   ", null, null);

            // Then
            assertThat(note.getTitle()).isEqualTo("Original Title");
        }
    }

    @Nested
    @DisplayName("Ownership Tests")
    class OwnershipTests {

        @Test
        @DisplayName("isOwnedBy should return true for note owner")
        void isOwnedByShouldReturnTrueForOwner() {
            // Given
            Note note = Note.create(userId, courseId, lessonId, "My Note", "Content", null);

            // Then
            assertThat(note.isOwnedBy(userId)).isTrue();
        }

        @Test
        @DisplayName("isOwnedBy should return false for other user")
        void isOwnedByShouldReturnFalseForOtherUser() {
            // Given
            Note note = Note.create(userId, courseId, lessonId, "My Note", "Content", null);
            UUID otherUserId = UUID.randomUUID();

            // Then
            assertThat(note.isOwnedBy(otherUserId)).isFalse();
        }
    }

    @Nested
    @DisplayName("Equality Tests")
    class EqualityTests {

        @Test
        @DisplayName("Two notes with same ID should be equal")
        void twoNotesWithSameIdShouldBeEqual() {
            // Given
            UUID noteId = UUID.randomUUID();
            Instant now = Instant.now();

            Note note1 = Note.reconstitute(noteId, userId, courseId, lessonId,
                "Title 1", "Content 1", List.of("tag1"), false, now, now);
            Note note2 = Note.reconstitute(noteId, UUID.randomUUID(), UUID.randomUUID(), null,
                "Title 2", "Content 2", List.of("tag2"), true, now, now);

            // Then
            assertThat(note1).isEqualTo(note2);
            assertThat(note1.hashCode()).isEqualTo(note2.hashCode());
        }

        @Test
        @DisplayName("Two notes with different IDs should not be equal")
        void twoNotesWithDifferentIdsShouldNotBeEqual() {
            // Given
            Instant now = Instant.now();

            Note note1 = Note.reconstitute(UUID.randomUUID(), userId, courseId, lessonId,
                "Title", "Content", null, false, now, now);
            Note note2 = Note.reconstitute(UUID.randomUUID(), userId, courseId, lessonId,
                "Title", "Content", null, false, now, now);

            // Then
            assertThat(note1).isNotEqualTo(note2);
        }
    }

    @Nested
    @DisplayName("Reconstitute Tests")
    class ReconstituteTests {

        @Test
        @DisplayName("Should reconstitute note from persistence data")
        void shouldReconstituteFromPersistenceData() {
            // Given
            UUID noteId = UUID.randomUUID();
            Instant createdAt = Instant.now().minusSeconds(3600);
            Instant updatedAt = Instant.now();
            List<String> tags = List.of("safety", "exam");

            // When
            Note note = Note.reconstitute(noteId, userId, courseId, lessonId,
                "Reconstituted Title", "Reconstituted Content", tags, true, createdAt, updatedAt);

            // Then
            assertThat(note.getId()).isEqualTo(noteId);
            assertThat(note.getUserId()).isEqualTo(userId);
            assertThat(note.getCourseId()).isEqualTo(courseId);
            assertThat(note.getLessonId()).isEqualTo(lessonId);
            assertThat(note.getTitle()).isEqualTo("Reconstituted Title");
            assertThat(note.getContent()).isEqualTo("Reconstituted Content");
            assertThat(note.getTags()).containsExactly("safety", "exam");
            assertThat(note.isPublic()).isTrue();
            assertThat(note.getCreatedAt()).isEqualTo(createdAt);
            assertThat(note.getUpdatedAt()).isEqualTo(updatedAt);
        }
    }
}
