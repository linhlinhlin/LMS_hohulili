package com.example.lms.learning_delivery.application.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Command to drop a student from a class.
 */
public record DropStudentCommand(
    @NotNull UUID studentId,
    @NotNull UUID classId,
    String reason
) {}
