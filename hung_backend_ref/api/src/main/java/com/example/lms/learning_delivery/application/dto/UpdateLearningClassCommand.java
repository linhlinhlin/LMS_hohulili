package com.example.lms.learning_delivery.application.dto;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

/**
 * Command to update a learning class.
 */
public record UpdateLearningClassCommand(
    @NotNull UUID classId,
    String name,
    String code,
    UUID teacherId,
    String scheduleType,
    String semester,
    Integer maxStudents,
    Instant startDate,
    Instant endDate
) {}
