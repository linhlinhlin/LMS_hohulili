package com.example.lms.assessment.application.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO for student assignment view.
 * Aggregates assignment metadata with student-specific submission status.
 */
public record StudentAssignmentResponse(
    UUID id,
    String title,
    String description,
    String instructions,
    String courseName,
    UUID courseId,
    String deliveryMode,
    String distributionType,
    UUID classId,
    String className,
    Instant dueDate,
    Integer maxScore,
    String status,        // NOT_SUBMITTED, SUBMITTED, GRADED, LATE, RESUBMITTED, RETURNED
    boolean isLate,       // Computed: submittedAt > dueDate
    Double score,         // Grade if graded
    String feedback,      // Teacher feedback
    Instant submittedAt,
    Instant gradedAt,
    String fileUrl,       // Submitted file URL
    String fileName,      // Submitted file name
    String content,       // Submitted text content
    UUID submissionId,    // Submission ID if exists
    boolean allowLateSubmission,
    Integer maxAttempts,
    /** Teacher uploaded standalone files dính kèm assignment (Google Classroom pattern). */
    List<AssignmentDTOs.InstructionAttachment> instructionAttachments
) {}
