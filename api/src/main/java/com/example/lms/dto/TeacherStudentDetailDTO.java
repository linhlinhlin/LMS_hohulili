package com.example.lms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * DTO for detailed student information
 * Used in student detail view with comprehensive data
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherStudentDetailDTO {
    
    private UUID id;
    private String fullName;
    private String email;
    private String phone;
    private String avatar;
    private Instant enrolledAt;
    private Instant lastAccessed;
    
    // Overall metrics
    private Integer progressPercentage;
    private Double averageGrade;
    private String status;
    
    // Detailed information
    private List<StudentCourseProgressDTO> courseProgress;
    private List<StudentAssignmentSummaryDTO> assignmentSubmissions;
    private StudentAnalyticsDTO analytics;
}
