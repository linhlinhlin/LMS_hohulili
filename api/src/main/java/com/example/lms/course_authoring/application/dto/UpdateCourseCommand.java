package com.example.lms.course_authoring.application.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.Set;
import java.util.UUID;

/**
 * Command for updating an existing course.
 */
public record UpdateCourseCommand(
    @NotNull(message = "Course ID không được để trống")
    UUID courseId,

    @NotNull(message = "User ID không được để trống")
    UUID userId,

    @Size(max = 255, message = "Tên khóa học không được vượt quá 255 ký tự")
    String title,

    String description,

    // Optional fields
    UUID categoryId,
    Set<String> tags,
    String welcomeMessage,
    String courseInformation,
    String benefits,
    String introVideoUrl,
    Integer credits,
    String visibility,
    String priceType,
    BigDecimal price,
    BigDecimal salePrice
) {}
