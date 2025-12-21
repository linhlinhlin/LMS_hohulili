package com.example.lms.assessment.application.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Command to start a quiz attempt.
 */
public record StartQuizAttemptCommand(
    @NotNull UUID quizId,
    @NotNull UUID studentId
) {}
