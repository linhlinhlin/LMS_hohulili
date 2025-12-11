package com.example.lms.entity;

import jakarta.persistence.*;
import jakarta.persistence.Convert;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "assignment_submissions")
public class AssignmentSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "attachment_url")
    private String attachmentUrl;

    @Column(precision = 5, scale = 2)
    private BigDecimal score;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "graded_at")
    private LocalDateTime gradedAt;

    @Convert(converter = com.example.lms.entity.converter.SubmissionStatusConverter.class)
    private Status status = Status.SUBMITTED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id", nullable = false)
    private Assignment assignment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum Status {
        SUBMITTED,
        GRADED,
        LATE_SUBMISSION
    }

    public AssignmentSubmission() {}

    public AssignmentSubmission(UUID id, String content, String attachmentUrl, BigDecimal score, String feedback, LocalDateTime submittedAt, LocalDateTime gradedAt, Status status, Assignment assignment, User student, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.content = content;
        this.attachmentUrl = attachmentUrl;
        this.score = score;
        this.feedback = feedback;
        this.submittedAt = submittedAt;
        this.gradedAt = gradedAt;
        this.status = status != null ? status : Status.SUBMITTED;
        this.assignment = assignment;
        this.student = student;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getAttachmentUrl() { return attachmentUrl; }
    public void setAttachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; }
    public BigDecimal getScore() { return score; }
    public void setScore(BigDecimal score) { this.score = score; }
    public String getFeedback() { return feedback; }
    public void setFeedback(String feedback) { this.feedback = feedback; }
    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }
    public LocalDateTime getGradedAt() { return gradedAt; }
    public void setGradedAt(LocalDateTime gradedAt) { this.gradedAt = gradedAt; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public Assignment getAssignment() { return assignment; }
    public void setAssignment(Assignment assignment) { this.assignment = assignment; }
    public User getStudent() { return student; }
    public void setStudent(User student) { this.student = student; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    // Builder
    public static AssignmentSubmissionBuilder builder() { return new AssignmentSubmissionBuilder(); }
    public static class AssignmentSubmissionBuilder {
        private AssignmentSubmission s = new AssignmentSubmission();
        public AssignmentSubmissionBuilder id(UUID i) { s.setId(i); return this; }
        public AssignmentSubmissionBuilder content(String c) { s.setContent(c); return this; }
        public AssignmentSubmissionBuilder attachmentUrl(String a) { s.setAttachmentUrl(a); return this; }
        public AssignmentSubmissionBuilder score(BigDecimal sc) { s.setScore(sc); return this; }
        public AssignmentSubmissionBuilder feedback(String f) { s.setFeedback(f); return this; }
        public AssignmentSubmissionBuilder submittedAt(LocalDateTime su) { s.setSubmittedAt(su); return this; }
        public AssignmentSubmissionBuilder gradedAt(LocalDateTime g) { s.setGradedAt(g); return this; }
        public AssignmentSubmissionBuilder status(Status st) { s.setStatus(st); return this; }
        public AssignmentSubmissionBuilder assignment(Assignment a) { s.setAssignment(a); return this; }
        public AssignmentSubmissionBuilder student(User st) { s.setStudent(st); return this; }
        public AssignmentSubmissionBuilder createdAt(LocalDateTime c) { s.setCreatedAt(c); return this; }
        public AssignmentSubmissionBuilder updatedAt(LocalDateTime u) { s.setUpdatedAt(u); return this; }
        public AssignmentSubmission build() { return s; }
    }
}