package com.example.lms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * DTO for teacher's view of student summary
 * Used in student list view with aggregated data
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherStudentSummaryDTO {
    
    private UUID id;
    private String fullName;
    private String email;
    private Instant enrolledAt;
    private Instant lastAccessed;
    
    // Aggregated metrics
    private Integer progressPercentage;      // Overall progress across all courses
    private Double averageGrade;             // Average grade across all assignments
    private String status;                   // active, inactive, suspended
    private Integer completedCourses;
    private Integer totalCourses;
    
    // For filtering and reference
    private List<UUID> enrolledCourseIds;
}
