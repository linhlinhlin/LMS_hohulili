package com.example.lms.assessment.application.usecase;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CreateAssignmentCommand(
    UUID lessonId,
    UUID courseId,
    String title,
    String description,
    String instructions,
    String type,
    Integer maxScore,
    Instant dueDate,
    Boolean allowLateSubmission,
    String distributionType,
    List<UUID> studentIds
) {}
