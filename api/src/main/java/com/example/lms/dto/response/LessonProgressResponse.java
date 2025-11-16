package com.example.lms.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for lesson progress information
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LessonProgressResponse {

    /**
     * Progress record ID
     */
    private UUID id;

    /**
     * Lesson ID
     */
    private UUID lessonId;

    /**
     * Current progress status
     */
    private String status;

    /**
     * Whether the lesson is completed
     */
    private boolean isCompleted;

    /**
     * When the student started the lesson
     */
    private Instant startedAt;

    /**
     * When the lesson was completed
     */
    private Instant completedAt;

    /**
     * Time spent on lesson in minutes (optional)
     */
    private Integer timeSpentMinutes;
}