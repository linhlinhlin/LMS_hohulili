package com.example.lms.learning_delivery.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

/**
 * Command for creating a new learning class.
 */
public record CreateLearningClassCommand(
    @NotBlank(message = "Tên lớp không được để trống")
    @Size(max = 255, message = "Tên lớp không được vượt quá 255 ký tự")
    String name,

    String code,

    @NotNull(message = "Course ID không được để trống")
    UUID courseId,

    UUID teacherId,

    String scheduleType,

    String semester,

    Integer maxStudents,

    Instant startDate,

    Instant endDate
) {}
