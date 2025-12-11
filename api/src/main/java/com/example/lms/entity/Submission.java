package com.example.lms.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "submissions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"assignment_id", "student_id"})
})
public class Submission {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id", nullable = false)
    private Assignment assignment;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
    
    @Column(name = "file_url", length = 500)
    private String fileUrl;
    
    @CreationTimestamp
    @Column(name = "submitted_at", nullable = false, updatable = false)
    private Instant submittedAt;
    
    @Column(precision = 5, scale = 2)
    private BigDecimal score;
    
    @Column(columnDefinition = "TEXT")
    private String feedback;
    
    @Column(name = "graded_at")
    private Instant gradedAt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "graded_by")
    private User gradedBy;

    public Submission() {}

    public Submission(UUID id, Assignment assignment, User student, String content, String fileUrl, Instant submittedAt, BigDecimal score, String feedback, Instant gradedAt, User gradedBy) {
        this.id = id;
        this.assignment = assignment;
        this.student = student;
        this.content = content;
        this.fileUrl = fileUrl;
        this.submittedAt = submittedAt;
        this.score = score;
        this.feedback = feedback;
        this.gradedAt = gradedAt;
        this.gradedBy = gradedBy;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Assignment getAssignment() { return assignment; }
    public void setAssignment(Assignment assignment) { this.assignment = assignment; }
    public User getStudent() { return student; }
    public void setStudent(User student) { this.student = student; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }
    public Instant getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Instant submittedAt) { this.submittedAt = submittedAt; }
    public BigDecimal getScore() { return score; }
    public void setScore(BigDecimal score) { this.score = score; }
    public String getFeedback() { return feedback; }
    public void setFeedback(String feedback) { this.feedback = feedback; }
    public Instant getGradedAt() { return gradedAt; }
    public void setGradedAt(Instant gradedAt) { this.gradedAt = gradedAt; }
    public User getGradedBy() { return gradedBy; }
    public void setGradedBy(User gradedBy) { this.gradedBy = gradedBy; }

    // Builder
    public static SubmissionBuilder builder() { return new SubmissionBuilder(); }
    public static class SubmissionBuilder {
        private Submission s = new Submission();
        public SubmissionBuilder id(UUID i) { s.setId(i); return this; }
        public SubmissionBuilder assignment(Assignment a) { s.setAssignment(a); return this; }
        public SubmissionBuilder student(User st) { s.setStudent(st); return this; }
        public SubmissionBuilder content(String c) { s.setContent(c); return this; }
        public SubmissionBuilder fileUrl(String f) { s.setFileUrl(f); return this; }
        public SubmissionBuilder submittedAt(Instant su) { s.setSubmittedAt(su); return this; }
        public SubmissionBuilder score(BigDecimal sc) { s.setScore(sc); return this; }
        public SubmissionBuilder feedback(String f) { s.setFeedback(f); return this; }
        public SubmissionBuilder gradedAt(Instant g) { s.setGradedAt(g); return this; }
        public SubmissionBuilder gradedBy(User u) { s.setGradedBy(u); return this; }
        public Submission build() { return s; }
    }
}