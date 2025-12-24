package com.example.lms.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.UUID;

/**
 * Response DTO for course progress summary
 */
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

    public CourseProgressResponse() {}

    public CourseProgressResponse(UUID courseId, int totalLessons, int completedLessons, double progressPercentage, boolean isCompleted) {
        this.courseId = courseId;
        this.totalLessons = totalLessons;
        this.completedLessons = completedLessons;
        this.progressPercentage = progressPercentage;
        this.isCompleted = isCompleted;
    }

    // Getters and Setters
    public UUID getCourseId() { return courseId; }
    public void setCourseId(UUID courseId) { this.courseId = courseId; }
    public int getTotalLessons() { return totalLessons; }
    public void setTotalLessons(int totalLessons) { this.totalLessons = totalLessons; }
    public int getCompletedLessons() { return completedLessons; }
    public void setCompletedLessons(int completedLessons) { this.completedLessons = completedLessons; }
    public double getProgressPercentage() { return progressPercentage; }
    public void setProgressPercentage(double progressPercentage) { this.progressPercentage = progressPercentage; }
    public boolean getIsCompleted() { return isCompleted; }
    public void setIsCompleted(boolean isCompleted) { this.isCompleted = isCompleted; }

    // Builder
    public static CourseProgressResponseBuilder builder() { return new CourseProgressResponseBuilder(); }
    public static class CourseProgressResponseBuilder {
        private CourseProgressResponse r = new CourseProgressResponse();
        public CourseProgressResponseBuilder courseId(UUID id) { r.setCourseId(id); return this; }
        public CourseProgressResponseBuilder totalLessons(int t) { r.setTotalLessons(t); return this; }
        public CourseProgressResponseBuilder completedLessons(int c) { r.setCompletedLessons(c); return this; }
        public CourseProgressResponseBuilder progressPercentage(double p) { r.setProgressPercentage(p); return this; }
        public CourseProgressResponseBuilder isCompleted(boolean c) { r.setIsCompleted(c); return this; }
        public CourseProgressResponse build() { return r; }
    }
}
