package com.example.lms.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for student enrollment details in a course.
 * Used by teacher to view enrolled students with their progress.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StudentEnrollmentDetail {
    
    /**
     * Student's unique ID
     */
    private String id;
    
    /**
     * Student's full name
     */
    private String fullName;
    
    /**
     * Student's email address
     */
    private String email;
    
    /**
     * Student's role in system
     */
    private String role;
    
    /**
     * Date when student enrolled in course
     */
    private LocalDateTime enrolledAt;
    
    /**
     * Current enrollment status (ACTIVE, DROPPED, COMPLETED)
     */
    private String status;
    
    /**
     * Progress percentage (0-100)
     */
    private Integer progressPercentage;
    
    /**
     * Number of lessons completed
     */
    private Integer lessonsCompleted;
    
    /**
     * Total number of lessons in course
     */
    private Integer totalLessons;
    
    /**
     * Quiz score if any (percentage)
     */
    private Double quizScore;
    
    /**
     * Assignment score if any (percentage)
     */
    private Double assignmentScore;
    
    /**
     * Last activity timestamp
     */
    private LocalDateTime lastActivityAt;
}
