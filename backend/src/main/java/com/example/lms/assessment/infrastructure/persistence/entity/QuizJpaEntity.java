package com.example.lms.assessment.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity for Quiz persistence.
 * Infrastructure layer - separate from domain model.
 */
@Entity
@Table(name = "quizzes")
public class QuizJpaEntity {
    // Manual boilerplate
    public QuizJpaEntity() {}
    public QuizJpaEntity(UUID id, UUID lessonId, String title, String description, Integer timeLimitMinutes, Integer maxAttempts, Integer passingScore, Double maxScoreScale, Boolean shuffleQuestions, Boolean shuffleOptions, Boolean showResultsImmediately, Boolean showCorrectAnswers, AssessmentType assessmentType, Boolean countsTowardCertificate, QuizStatus status, java.util.List<QuizQuestionJpaEntity> questions, Instant createdAt, Instant updatedAt, Instant availableFrom, Instant dueAt, Instant lockAt, String accessPassword) {
        this.id = id; this.lessonId = lessonId; this.title = title; this.description = description; this.timeLimitMinutes = timeLimitMinutes; this.maxAttempts = maxAttempts; this.passingScore = passingScore; this.maxScoreScale = maxScoreScale; this.shuffleQuestions = shuffleQuestions; this.shuffleOptions = shuffleOptions; this.showResultsImmediately = showResultsImmediately; this.showCorrectAnswers = showCorrectAnswers; this.assessmentType = assessmentType; this.countsTowardCertificate = countsTowardCertificate; this.status = status; this.questions = questions; this.createdAt = createdAt; this.updatedAt = updatedAt; this.availableFrom = availableFrom; this.dueAt = dueAt; this.lockAt = lockAt; this.accessPassword = accessPassword;
    }
    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private UUID id; private UUID lessonId; private String title; private String description; private Integer timeLimitMinutes; private Integer maxAttempts = 3; private Integer passingScore = 60; private Double maxScoreScale = 10.0; private Boolean shuffleQuestions = false; private Boolean shuffleOptions = false; private Boolean showResultsImmediately = true; private Boolean showCorrectAnswers = true; private AssessmentType assessmentType = AssessmentType.ASSESSMENT; private Boolean countsTowardCertificate = false; private QuizStatus status = QuizStatus.DRAFT; private java.util.List<QuizQuestionJpaEntity> questions; private Instant createdAt; private Instant updatedAt; private Instant availableFrom; private Instant dueAt; private Instant lockAt; private String accessPassword;
        public Builder id(UUID id) { this.id = id; return this; }
        public Builder lessonId(UUID lessonId) { this.lessonId = lessonId; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder timeLimitMinutes(Integer timeLimitMinutes) { this.timeLimitMinutes = timeLimitMinutes; return this; }
        public Builder maxAttempts(Integer maxAttempts) { this.maxAttempts = maxAttempts; return this; }
        public Builder passingScore(Integer passingScore) { this.passingScore = passingScore; return this; }
        public Builder maxScoreScale(Double maxScoreScale) { this.maxScoreScale = maxScoreScale; return this; }
        public Builder shuffleQuestions(Boolean shuffleQuestions) { this.shuffleQuestions = shuffleQuestions; return this; }
        public Builder shuffleOptions(Boolean shuffleOptions) { this.shuffleOptions = shuffleOptions; return this; }
        public Builder showResultsImmediately(Boolean showResultsImmediately) { this.showResultsImmediately = showResultsImmediately; return this; }
        public Builder showCorrectAnswers(Boolean showCorrectAnswers) { this.showCorrectAnswers = showCorrectAnswers; return this; }
        public Builder assessmentType(AssessmentType assessmentType) { this.assessmentType = assessmentType; return this; }
        public Builder countsTowardCertificate(Boolean countsTowardCertificate) { this.countsTowardCertificate = countsTowardCertificate; return this; }
        public Builder status(QuizStatus status) { this.status = status; return this; }
        public Builder questions(java.util.List<QuizQuestionJpaEntity> questions) { this.questions = questions; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }
        public Builder availableFrom(Instant availableFrom) { this.availableFrom = availableFrom; return this; }
        public Builder dueAt(Instant dueAt) { this.dueAt = dueAt; return this; }
        public Builder lockAt(Instant lockAt) { this.lockAt = lockAt; return this; }
        public Builder accessPassword(String accessPassword) { this.accessPassword = accessPassword; return this; }
        public QuizJpaEntity build() { return new QuizJpaEntity(id, lessonId, title, description, timeLimitMinutes, maxAttempts, passingScore, maxScoreScale, shuffleQuestions, shuffleOptions, showResultsImmediately, showCorrectAnswers, assessmentType, countsTowardCertificate, status, questions, createdAt, updatedAt, availableFrom, dueAt, lockAt, accessPassword); }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "lesson_id", nullable = false)
    private UUID lessonId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "time_limit_minutes")
    private Integer timeLimitMinutes;

    @Column(name = "max_attempts")
    private Integer maxAttempts = 3;

    @Column(name = "passing_score")
    private Integer passingScore = 60;

    @Column(name = "max_score_scale")
    private Double maxScoreScale = 10.0;

    @Column(name = "shuffle_questions")
    private Boolean shuffleQuestions = false;

    @Column(name = "shuffle_options")
    private Boolean shuffleOptions = false;

    @Column(name = "show_results_immediately")
    private Boolean showResultsImmediately = true;

    @Column(name = "show_correct_answers")
    private Boolean showCorrectAnswers = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "quiz_type", nullable = false)
    private AssessmentType assessmentType = AssessmentType.ASSESSMENT;

    @Column(name = "counts_toward_certificate", nullable = false)
    private Boolean countsTowardCertificate = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuizStatus status = QuizStatus.DRAFT;

    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("displayOrder ASC")
    @org.hibernate.annotations.Fetch(org.hibernate.annotations.FetchMode.SUBSELECT)
    private java.util.List<QuizQuestionJpaEntity> questions;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "available_from")
    private Instant availableFrom;

    @Column(name = "due_at")
    private Instant dueAt;

    @Column(name = "lock_at")
    private Instant lockAt;

    @Column(name = "access_password", length = 50)
    private String accessPassword;

    // Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getLessonId() { return lessonId; }
    public void setLessonId(UUID lessonId) { this.lessonId = lessonId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Integer getTimeLimitMinutes() { return timeLimitMinutes; }
    public void setTimeLimitMinutes(Integer timeLimitMinutes) { this.timeLimitMinutes = timeLimitMinutes; }
    public Integer getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(Integer maxAttempts) { this.maxAttempts = maxAttempts; }
    public Integer getPassingScore() { return passingScore; }
    public void setPassingScore(Integer passingScore) { this.passingScore = passingScore; }
    public Double getMaxScoreScale() { return maxScoreScale; }
    public void setMaxScoreScale(Double maxScoreScale) { this.maxScoreScale = maxScoreScale; }
    public Boolean getShuffleQuestions() { return shuffleQuestions; }
    public void setShuffleQuestions(Boolean shuffleQuestions) { this.shuffleQuestions = shuffleQuestions; }
    public Boolean getShuffleOptions() { return shuffleOptions; }
    public void setShuffleOptions(Boolean shuffleOptions) { this.shuffleOptions = shuffleOptions; }
    public Boolean getShowResultsImmediately() { return showResultsImmediately; }
    public void setShowResultsImmediately(Boolean showResultsImmediately) { this.showResultsImmediately = showResultsImmediately; }
    public Boolean getShowCorrectAnswers() { return showCorrectAnswers; }
    public void setShowCorrectAnswers(Boolean showCorrectAnswers) { this.showCorrectAnswers = showCorrectAnswers; }
    public AssessmentType getAssessmentType() { return assessmentType; }
    public void setAssessmentType(AssessmentType assessmentType) { this.assessmentType = assessmentType; }
    public Boolean getCountsTowardCertificate() { return countsTowardCertificate; }
    public void setCountsTowardCertificate(Boolean countsTowardCertificate) { this.countsTowardCertificate = countsTowardCertificate; }
    public QuizStatus getStatus() { return status; }
    public void setStatus(QuizStatus status) { this.status = status; }
    public java.util.List<QuizQuestionJpaEntity> getQuestions() { return questions; }
    public void setQuestions(java.util.List<QuizQuestionJpaEntity> questions) { this.questions = questions; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public Instant getAvailableFrom() { return availableFrom; }
    public void setAvailableFrom(Instant availableFrom) { this.availableFrom = availableFrom; }
    public Instant getDueAt() { return dueAt; }
    public void setDueAt(Instant dueAt) { this.dueAt = dueAt; }
    public Instant getLockAt() { return lockAt; }
    public void setLockAt(Instant lockAt) { this.lockAt = lockAt; }
    public String getAccessPassword() { return accessPassword; }
    public void setAccessPassword(String accessPassword) { this.accessPassword = accessPassword; }

    public enum QuizStatus {
        DRAFT, PUBLISHED, ARCHIVED
    }

    public enum AssessmentType {
        PRACTICE, ASSESSMENT, EXAM
    }
}
