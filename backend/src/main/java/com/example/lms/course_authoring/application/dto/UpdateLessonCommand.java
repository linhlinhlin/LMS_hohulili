package com.example.lms.course_authoring.application.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * Command for updating a lesson.
 */
public record UpdateLessonCommand(
    @NotNull(message = "Course ID không được để trống")
    UUID courseId,

    // chapterId is optional - if null, will scan chapters to find lesson
    UUID chapterId,

    @NotNull(message = "Lesson ID không được để trống")
    UUID lessonId,

    @NotNull(message = "User ID không được để trống")
    UUID userId,

    @Size(max = 255, message = "Tên bài học không được vượt quá 255 ký tự")
    String title,

    String description,

    String lessonType,

    String content,

    String videoUrl,

    Integer durationMinutes,

    Boolean isRequired,

    Boolean isPreview,

    boolean isAdmin
) {}
