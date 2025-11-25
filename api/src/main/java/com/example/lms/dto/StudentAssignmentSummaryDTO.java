package com.example.lms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for student's assignment submission summary
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentAssignmentSummaryDTO {
    
    private UUID assignmentId;
    private String assignmentTitle;
    private String courseTitle;
    private LocalDateTime dueDate;
    private Instant submittedAt;
    private String status;  // pending, submitted, graded, overdue
    private BigDecimal score;
    private BigDecimal maxScore;
    private String feedback;
}
