package com.example.lms.assessment.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CreateAssignmentCommand(
    UUID lessonId,
    @NotNull(message = "courseId là bắt buộc")
    UUID courseId,
    @NotBlank(message = "Tiêu đề bài tập là bắt buộc")
    String title,
    String description,
    String instructions,
    String type,
    Integer maxScore,
    Instant dueDate,
    Boolean allowLateSubmission,
    String status,
    String distributionType,
    UUID classId,
    List<UUID> studentIds
) {}
