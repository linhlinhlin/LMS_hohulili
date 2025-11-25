package com.example.lms.dto.response;

import com.example.lms.entity.QuizAssignment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for QuizAssignment
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizAssignmentResponse {

    private UUID id;
    
    // Quiz info
    private UUID quizId;
    private String quizTitle;
    private Integer questionCount;
    
    // Student info
    private UUID studentId;
    private String studentName;
    private String studentEmail;
    
    // Assignment info
    private QuizAssignment.AssignmentStatus status;
    private Instant assignedAt;
    private Instant dueDate;
    private Instant completedAt;
    
    // Progress info
    private Integer attemptCount;
    private Integer maxAttempts;
    private Double bestScore;
    private Boolean isPassed;
}
