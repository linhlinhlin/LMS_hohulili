package com.example.lms.learning_delivery.application.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Command for enrolling a student in a class.
 */
public record EnrollStudentCommand(
    @NotNull(message = "Student ID không được để trống")
    UUID studentId,

    @NotNull(message = "Class ID không được để trống")
    UUID classId
) {}
