package com.example.lms.course_authoring.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * Command for creating a new lesson.
 */
public record CreateLessonCommand(
    @NotNull(message = "Course ID không được để trống")
    UUID courseId,

    @NotNull(message = "Chapter ID không được để trống")
    UUID chapterId,

    @NotNull(message = "User ID không được để trống")
    UUID userId,

    @NotBlank(message = "Tên bài học không được để trống")
    @Size(max = 255, message = "Tên bài học không được vượt quá 255 ký tự")
    String title,

    String description,

    String lessonType, // LECTURE, VIDEO, QUIZ, ASSIGNMENT, READING, DISCUSSION

    String content,

    String videoUrl,

    Integer durationMinutes,

    Boolean isRequired,

    Boolean isPreview
) {
    /**
     * Simple constructor for basic lesson creation.
     */
    public CreateLessonCommand(UUID courseId, UUID chapterId, UUID userId, String title, String description, String lessonType) {
        this(courseId, chapterId, userId, title, description, lessonType, null, null, null, true, false);
    }
}
