package com.example.lms.assessment.application.dto;

import jakarta.validation.constraints.NotNull;
import java.util.Map;
import java.util.UUID;

/**
 * Command to submit a quiz attempt.
 */
public record SubmitQuizCommand(
    @NotNull UUID attemptId,
    @NotNull Map<UUID, String> answers // questionId -> selected answer
) {}
