package com.example.lms.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * Response DTO for completed lesson IDs in a course
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CompletedLessonIdsResponse {

    /**
     * Course ID
     */
    private UUID courseId;

    /**
     * List of completed lesson IDs
     */
    private List<UUID> completedLessonIds;
}