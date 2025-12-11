package com.example.lms.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * DTO for detailed student information
 * Used in student detail view with comprehensive data
 */
public class TeacherStudentDetailDTO {
    
    private UUID id;
    private String fullName;
    private String email;
    private String phone;
    private String avatar;
    private Instant enrolledAt;
    private Instant lastAccessed;
    
    // Overall metrics
    private Integer progressPercentage;
    private Double averageGrade;
    private String status;
    
    // Detailed information
    private List<StudentCourseProgressDTO> courseProgress;
    private List<StudentAssignmentSummaryDTO> assignmentSubmissions;
    private StudentAnalyticsDTO analytics;

    public TeacherStudentDetailDTO() {}

    public TeacherStudentDetailDTO(UUID id, String fullName, String email, String phone, String avatar, Instant enrolledAt, Instant lastAccessed, Integer progressPercentage, Double averageGrade, String status, List<StudentCourseProgressDTO> courseProgress, List<StudentAssignmentSummaryDTO> assignmentSubmissions, StudentAnalyticsDTO analytics) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.avatar = avatar;
        this.enrolledAt = enrolledAt;
        this.lastAccessed = lastAccessed;
        this.progressPercentage = progressPercentage;
        this.averageGrade = averageGrade;
        this.status = status;
        this.courseProgress = courseProgress;
        this.assignmentSubmissions = assignmentSubmissions;
        this.analytics = analytics;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
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
    public List<StudentCourseProgressDTO> getCourseProgress() { return courseProgress; }
    public void setCourseProgress(List<StudentCourseProgressDTO> courseProgress) { this.courseProgress = courseProgress; }
    public List<StudentAssignmentSummaryDTO> getAssignmentSubmissions() { return assignmentSubmissions; }
    public void setAssignmentSubmissions(List<StudentAssignmentSummaryDTO> assignmentSubmissions) { this.assignmentSubmissions = assignmentSubmissions; }
    public StudentAnalyticsDTO getAnalytics() { return analytics; }
    public void setAnalytics(StudentAnalyticsDTO analytics) { this.analytics = analytics; }

    // Builder
    public static TeacherStudentDetailDTOBuilder builder() { return new TeacherStudentDetailDTOBuilder(); }
    public static class TeacherStudentDetailDTOBuilder {
        private TeacherStudentDetailDTO dto = new TeacherStudentDetailDTO();
        public TeacherStudentDetailDTOBuilder id(UUID i) { dto.setId(i); return this; }
        public TeacherStudentDetailDTOBuilder fullName(String f) { dto.setFullName(f); return this; }
        public TeacherStudentDetailDTOBuilder email(String e) { dto.setEmail(e); return this; }
        public TeacherStudentDetailDTOBuilder phone(String p) { dto.setPhone(p); return this; }
        public TeacherStudentDetailDTOBuilder avatar(String a) { dto.setAvatar(a); return this; }
        public TeacherStudentDetailDTOBuilder enrolledAt(Instant e) { dto.setEnrolledAt(e); return this; }
        public TeacherStudentDetailDTOBuilder lastAccessed(Instant l) { dto.setLastAccessed(l); return this; }
        public TeacherStudentDetailDTOBuilder progressPercentage(Integer p) { dto.setProgressPercentage(p); return this; }
        public TeacherStudentDetailDTOBuilder averageGrade(Double a) { dto.setAverageGrade(a); return this; }
        public TeacherStudentDetailDTOBuilder status(String s) { dto.setStatus(s); return this; }
        public TeacherStudentDetailDTOBuilder courseProgress(List<StudentCourseProgressDTO> c) { dto.setCourseProgress(c); return this; }
        public TeacherStudentDetailDTOBuilder assignmentSubmissions(List<StudentAssignmentSummaryDTO> a) { dto.setAssignmentSubmissions(a); return this; }
        public TeacherStudentDetailDTOBuilder analytics(StudentAnalyticsDTO a) { dto.setAnalytics(a); return this; }
        public TeacherStudentDetailDTO build() { return dto; }
    }
}
