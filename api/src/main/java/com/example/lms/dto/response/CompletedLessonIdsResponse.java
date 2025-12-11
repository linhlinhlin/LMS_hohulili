package com.example.lms.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO for completed lesson IDs in a course
 */
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

    public CompletedLessonIdsResponse() {}

    public CompletedLessonIdsResponse(UUID courseId, List<UUID> completedLessonIds) {
        this.courseId = courseId;
        this.completedLessonIds = completedLessonIds;
    }

    // Getters and Setters
    public UUID getCourseId() { return courseId; }
    public void setCourseId(UUID courseId) { this.courseId = courseId; }
    public List<UUID> getCompletedLessonIds() { return completedLessonIds; }
    public void setCompletedLessonIds(List<UUID> completedLessonIds) { this.completedLessonIds = completedLessonIds; }

    // Builder
    public static CompletedLessonIdsResponseBuilder builder() { return new CompletedLessonIdsResponseBuilder(); }
    public static class CompletedLessonIdsResponseBuilder {
        private CompletedLessonIdsResponse r = new CompletedLessonIdsResponse();
        public CompletedLessonIdsResponseBuilder courseId(UUID id) { r.setCourseId(id); return this; }
        public CompletedLessonIdsResponseBuilder completedLessonIds(List<UUID> c) { r.setCompletedLessonIds(c); return this; }
        public CompletedLessonIdsResponse build() { return r; }
    }
}