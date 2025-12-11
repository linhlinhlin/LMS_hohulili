package com.example.lms.dto.response;

import com.example.lms.entity.QuizAssignment;
import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for QuizAssignment
 */
public class QuizAssignmentResponse {

    private UUID id;
    
    // Quiz info
    private UUID quizId;
    private String quizTitle;
    private Integer questionCount;
    
    // Student info
    private UUID studentId;
    private String studentName;
    private String studentEmail;
    
    // Assignment info
    private QuizAssignment.AssignmentStatus status;
    private Instant assignedAt;
    private Instant dueDate;
    private Instant completedAt;
    
    // Progress info
    private Integer attemptCount;
    private Integer maxAttempts;
    private Double bestScore;
    private Boolean isPassed;

    public QuizAssignmentResponse() {}

    public QuizAssignmentResponse(UUID id, UUID quizId, String quizTitle, Integer questionCount, UUID studentId, String studentName, String studentEmail, QuizAssignment.AssignmentStatus status, Instant assignedAt, Instant dueDate, Instant completedAt, Integer attemptCount, Integer maxAttempts, Double bestScore, Boolean isPassed) {
        this.id = id;
        this.quizId = quizId;
        this.quizTitle = quizTitle;
        this.questionCount = questionCount;
        this.studentId = studentId;
        this.studentName = studentName;
        this.studentEmail = studentEmail;
        this.status = status;
        this.assignedAt = assignedAt;
        this.dueDate = dueDate;
        this.completedAt = completedAt;
        this.attemptCount = attemptCount;
        this.maxAttempts = maxAttempts;
        this.bestScore = bestScore;
        this.isPassed = isPassed;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getQuizId() { return quizId; }
    public void setQuizId(UUID quizId) { this.quizId = quizId; }
    public String getQuizTitle() { return quizTitle; }
    public void setQuizTitle(String quizTitle) { this.quizTitle = quizTitle; }
    public Integer getQuestionCount() { return questionCount; }
    public void setQuestionCount(Integer questionCount) { this.questionCount = questionCount; }
    public UUID getStudentId() { return studentId; }
    public void setStudentId(UUID studentId) { this.studentId = studentId; }
    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }
    public String getStudentEmail() { return studentEmail; }
    public void setStudentEmail(String studentEmail) { this.studentEmail = studentEmail; }
    public QuizAssignment.AssignmentStatus getStatus() { return status; }
    public void setStatus(QuizAssignment.AssignmentStatus status) { this.status = status; }
    public Instant getAssignedAt() { return assignedAt; }
    public void setAssignedAt(Instant assignedAt) { this.assignedAt = assignedAt; }
    public Instant getDueDate() { return dueDate; }
    public void setDueDate(Instant dueDate) { this.dueDate = dueDate; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
    public Integer getAttemptCount() { return attemptCount; }
    public void setAttemptCount(Integer attemptCount) { this.attemptCount = attemptCount; }
    public Integer getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(Integer maxAttempts) { this.maxAttempts = maxAttempts; }
    public Double getBestScore() { return bestScore; }
    public void setBestScore(Double bestScore) { this.bestScore = bestScore; }
    public Boolean getIsPassed() { return isPassed; }
    public void setIsPassed(Boolean isPassed) { this.isPassed = isPassed; }

    // Builder
    public static QuizAssignmentResponseBuilder builder() { return new QuizAssignmentResponseBuilder(); }
    public static class QuizAssignmentResponseBuilder {
        private QuizAssignmentResponse r = new QuizAssignmentResponse();
        public QuizAssignmentResponseBuilder id(UUID id) { r.setId(id); return this; }
        public QuizAssignmentResponseBuilder quizId(UUID id) { r.setQuizId(id); return this; }
        public QuizAssignmentResponseBuilder quizTitle(String t) { r.setQuizTitle(t); return this; }
        public QuizAssignmentResponseBuilder questionCount(Integer c) { r.setQuestionCount(c); return this; }
        public QuizAssignmentResponseBuilder studentId(UUID id) { r.setStudentId(id); return this; }
        public QuizAssignmentResponseBuilder studentName(String n) { r.setStudentName(n); return this; }
        public QuizAssignmentResponseBuilder studentEmail(String e) { r.setStudentEmail(e); return this; }
        public QuizAssignmentResponseBuilder status(QuizAssignment.AssignmentStatus s) { r.setStatus(s); return this; }
        public QuizAssignmentResponseBuilder assignedAt(Instant a) { r.setAssignedAt(a); return this; }
        public QuizAssignmentResponseBuilder dueDate(Instant d) { r.setDueDate(d); return this; }
        public QuizAssignmentResponseBuilder completedAt(Instant c) { r.setCompletedAt(c); return this; }
        public QuizAssignmentResponseBuilder attemptCount(Integer c) { r.setAttemptCount(c); return this; }
        public QuizAssignmentResponseBuilder maxAttempts(Integer m) { r.setMaxAttempts(m); return this; }
        public QuizAssignmentResponseBuilder bestScore(Double s) { r.setBestScore(s); return this; }
        public QuizAssignmentResponseBuilder isPassed(Boolean p) { r.setIsPassed(p); return this; }
        public QuizAssignmentResponse build() { return r; }
    }
}
