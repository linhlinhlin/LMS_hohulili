package com.example.lms.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Response DTO for course progress summary
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CourseProgressResponse {

    /**
     * Course ID
     */
    private UUID courseId;

    /**
     * Total number of lessons in the course
     */
    private int totalLessons;

    /**
     * Number of completed lessons
     */
    private int completedLessons;

    /**
     * Progress percentage (0-100)
     */
    private double progressPercentage;

    /**
     * Whether the entire course is completed
     */
    private boolean isCompleted;
}