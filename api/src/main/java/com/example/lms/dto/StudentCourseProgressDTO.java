package com.example.lms.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * DTO for student's progress in a specific course
 */
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

    public StudentCourseProgressDTO() {}

    public StudentCourseProgressDTO(UUID courseId, String courseTitle, Instant enrolledAt, Integer progressPercentage, Integer completedLessons, Integer totalLessons, Instant lastAccessed, Double grade, String status) {
        this.courseId = courseId;
        this.courseTitle = courseTitle;
        this.enrolledAt = enrolledAt;
        this.progressPercentage = progressPercentage;
        this.completedLessons = completedLessons;
        this.totalLessons = totalLessons;
        this.lastAccessed = lastAccessed;
        this.grade = grade;
        this.status = status;
    }

    // Getters and Setters
    public UUID getCourseId() { return courseId; }
    public void setCourseId(UUID courseId) { this.courseId = courseId; }
    public String getCourseTitle() { return courseTitle; }
    public void setCourseTitle(String courseTitle) { this.courseTitle = courseTitle; }
    public Instant getEnrolledAt() { return enrolledAt; }
    public void setEnrolledAt(Instant enrolledAt) { this.enrolledAt = enrolledAt; }
    public Integer getProgressPercentage() { return progressPercentage; }
    public void setProgressPercentage(Integer progressPercentage) { this.progressPercentage = progressPercentage; }
    public Integer getCompletedLessons() { return completedLessons; }
    public void setCompletedLessons(Integer completedLessons) { this.completedLessons = completedLessons; }
    public Integer getTotalLessons() { return totalLessons; }
    public void setTotalLessons(Integer totalLessons) { this.totalLessons = totalLessons; }
    public Instant getLastAccessed() { return lastAccessed; }
    public void setLastAccessed(Instant lastAccessed) { this.lastAccessed = lastAccessed; }
    public Double getGrade() { return grade; }
    public void setGrade(Double grade) { this.grade = grade; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    // Builder
    public static StudentCourseProgressDTOBuilder builder() { return new StudentCourseProgressDTOBuilder(); }
    public static class StudentCourseProgressDTOBuilder {
        private StudentCourseProgressDTO dto = new StudentCourseProgressDTO();
        public StudentCourseProgressDTOBuilder courseId(UUID c) { dto.setCourseId(c); return this; }
        public StudentCourseProgressDTOBuilder courseTitle(String t) { dto.setCourseTitle(t); return this; }
        public StudentCourseProgressDTOBuilder enrolledAt(Instant e) { dto.setEnrolledAt(e); return this; }
        public StudentCourseProgressDTOBuilder progressPercentage(Integer p) { dto.setProgressPercentage(p); return this; }
        public StudentCourseProgressDTOBuilder completedLessons(Integer c) { dto.setCompletedLessons(c); return this; }
        public StudentCourseProgressDTOBuilder totalLessons(Integer t) { dto.setTotalLessons(t); return this; }
        public StudentCourseProgressDTOBuilder lastAccessed(Instant l) { dto.setLastAccessed(l); return this; }
        public StudentCourseProgressDTOBuilder grade(Double g) { dto.setGrade(g); return this; }
        public StudentCourseProgressDTOBuilder status(String s) { dto.setStatus(s); return this; }
        public StudentCourseProgressDTO build() { return dto; }
    }
}
