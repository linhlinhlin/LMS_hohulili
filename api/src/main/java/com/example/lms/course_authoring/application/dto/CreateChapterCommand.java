package com.example.lms.course_authoring.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * Command for creating a new chapter.
 */
public record CreateChapterCommand(
    @NotNull(message = "Course ID không được để trống")
    UUID courseId,

    @NotNull(message = "User ID không được để trống")
    UUID userId,

    @NotBlank(message = "Tên chương không được để trống")
    @Size(max = 255, message = "Tên chương không được vượt quá 255 ký tự")
    String title,

    String description
) {}
