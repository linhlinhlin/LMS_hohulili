package com.example.lms.course_authoring.application.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * Command for updating a chapter.
 */
public record UpdateChapterCommand(
    @NotNull(message = "Course ID không được để trống")
    UUID courseId,

    @NotNull(message = "Chapter ID không được để trống")
    UUID chapterId,

    @NotNull(message = "User ID không được để trống")
    UUID userId,

    @Size(max = 255, message = "Tên chương không được vượt quá 255 ký tự")
    String title,



    String description,

    boolean isAdmin
) {}
