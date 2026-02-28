package com.example.lms.course_authoring.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.Set;
import java.util.UUID;

/**
 * Command for creating a new course.
 */
public record CreateCourseCommand(
    @NotBlank(message = "Mã khóa học không được để trống")
    @Size(min = 3, max = 64, message = "Mã khóa học phải từ 3-64 ký tự")
    String code,

    @NotBlank(message = "Tên khóa học không được để trống")
    @Size(max = 255, message = "Tên khóa học không được vượt quá 255 ký tự")
    String title,

    String description,

    @NotNull(message = "Teacher ID không được để trống")
    UUID teacherId,

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
) {
    /**
     * Simple constructor for basic course creation.
     */
    public CreateCourseCommand(String code, String title, String description, UUID teacherId) {
        this(code, title, description, teacherId, 
             null, null, null, null, null, null, null, null, null, null, null);
    }
}
