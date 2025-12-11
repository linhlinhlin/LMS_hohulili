package com.example.lms.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * DTO for teacher's view of student summary
 * Used in student list view with aggregated data
 */
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

    public TeacherStudentSummaryDTO() {}

    public TeacherStudentSummaryDTO(UUID id, String fullName, String email, Instant enrolledAt, Instant lastAccessed, Integer progressPercentage, Double averageGrade, String status, Integer completedCourses, Integer totalCourses, List<UUID> enrolledCourseIds) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.enrolledAt = enrolledAt;
        this.lastAccessed = lastAccessed;
        this.progressPercentage = progressPercentage;
        this.averageGrade = averageGrade;
        this.status = status;
        this.completedCourses = completedCourses;
        this.totalCourses = totalCourses;
        this.enrolledCourseIds = enrolledCourseIds;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public Instant getEnrolledAt() { return enrolledAt; }
    public void setEnrolledAt(Instant enrolledAt) { this.enrolledAt = enrolledAt; }
    public Instant getLastAccessed() { return lastAccessed; }
    public void setLastAccessed(Instant lastAccessed) { this.lastAccessed = lastAccessed; }
    public Integer getProgressPercentage() { return progressPercentage; }
    public void setProgressPercentage(Integer progressPercentage) { this.progressPercentage = progressPercentage; }
    public Double getAverageGrade() { return averageGrade; }
    public void setAverageGrade(Double averageGrade) { this.averageGrade = averageGrade; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getCompletedCourses() { return completedCourses; }
    public void setCompletedCourses(Integer completedCourses) { this.completedCourses = completedCourses; }
    public Integer getTotalCourses() { return totalCourses; }
    public void setTotalCourses(Integer totalCourses) { this.totalCourses = totalCourses; }
    public List<UUID> getEnrolledCourseIds() { return enrolledCourseIds; }
    public void setEnrolledCourseIds(List<UUID> enrolledCourseIds) { this.enrolledCourseIds = enrolledCourseIds; }

    // Builder
    public static TeacherStudentSummaryDTOBuilder builder() { return new TeacherStudentSummaryDTOBuilder(); }
    public static class TeacherStudentSummaryDTOBuilder {
        private TeacherStudentSummaryDTO dto = new TeacherStudentSummaryDTO();
        public TeacherStudentSummaryDTOBuilder id(UUID i) { dto.setId(i); return this; }
        public TeacherStudentSummaryDTOBuilder fullName(String f) { dto.setFullName(f); return this; }
        public TeacherStudentSummaryDTOBuilder email(String e) { dto.setEmail(e); return this; }
        public TeacherStudentSummaryDTOBuilder enrolledAt(Instant e) { dto.setEnrolledAt(e); return this; }
        public TeacherStudentSummaryDTOBuilder lastAccessed(Instant l) { dto.setLastAccessed(l); return this; }
        public TeacherStudentSummaryDTOBuilder progressPercentage(Integer p) { dto.setProgressPercentage(p); return this; }
        public TeacherStudentSummaryDTOBuilder averageGrade(Double a) { dto.setAverageGrade(a); return this; }
        public TeacherStudentSummaryDTOBuilder status(String s) { dto.setStatus(s); return this; }
        public TeacherStudentSummaryDTOBuilder completedCourses(Integer c) { dto.setCompletedCourses(c); return this; }
        public TeacherStudentSummaryDTOBuilder totalCourses(Integer t) { dto.setTotalCourses(t); return this; }
        public TeacherStudentSummaryDTOBuilder enrolledCourseIds(List<UUID> e) { dto.setEnrolledCourseIds(e); return this; }
        public TeacherStudentSummaryDTO build() { return dto; }
    }
}
