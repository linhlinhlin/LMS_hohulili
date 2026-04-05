package com.example.lms.assessment.application.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Unified response DTO for student task inbox.
 * Represents both assignments and quiz-type work items.
 */
public record StudentTaskResponse(
    UUID id,
    String workType,           // ASSIGNMENT | QUIZ | EXAM | PRACTICE
    String title,
    String description,
    UUID courseId,
    String courseName,
    Instant dueDate,
    Instant availableFrom,     // Canvas "Available from" — quiz not attemptable before this
    Instant lockAt,            // Canvas "Until" — hard deadline, no access after this
    String status,             // NOT_STARTED | IN_PROGRESS | SUBMITTED | GRADED | OVERDUE | LOCKED | NOT_AVAILABLE
    boolean isLate,
    Double score,
    Integer maxScore,
    String feedback,
    // Assignment-specific
    UUID submissionId,
    Instant submittedAt,
    String fileUrl,
    String fileName,
    // Quiz-specific
    UUID attemptId,
    Integer timeLimitMinutes,
    Integer maxAttempts,
    Integer questionCount,
    Integer passingScore,
    Boolean isPassed,
    Integer attemptCount,
    Boolean requiresPassword
) {}
