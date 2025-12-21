package com.example.lms.learning_delivery.application.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

/**
 * Command to enroll multiple students in a class.
 */
public record BulkEnrollCommand(
    @NotNull UUID classId,
    @NotEmpty List<UUID> studentIds
) {}
