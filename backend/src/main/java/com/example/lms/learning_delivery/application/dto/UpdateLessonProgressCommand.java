package com.example.lms.learning_delivery.application.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Command to update lesson progress for a student.
 */
public record UpdateLessonProgressCommand(
    @NotNull UUID enrollmentId,
    @NotNull UUID lessonId,
    String status,        // LOCKED, UNLOCKED, COMPLETED
    Integer watchSeconds,
    Double grade
) {}
