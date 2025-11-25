package com.example.lms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * DTO for student's progress in a specific course
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentCourseProgressDTO {
    
    private UUID courseId;
    private String courseTitle;
    private Instant enrolledAt;
    private Integer progressPercentage;
    private Integer completedLessons;
    private Integer totalLessons;
    private Instant lastAccessed;
    private Double grade;
    private String status;  // in-progress, completed, dropped
}
