package com.example.lms.assessment.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity for Assignment persistence.
 */
@Entity
@Table(name = "assignments")
public class AssignmentJpaEntity {

    // Manual boilerplate
    public AssignmentJpaEntity() {}
    public AssignmentJpaEntity(UUID id, UUID lessonId, UUID courseId, String title, String description, String instructions, AssignmentType type, AssignmentStatus status, Integer maxScore, Integer passingScore, Instant dueDate, Integer maxAttempts, Boolean allowLateSubmission, Instant createdAt, Instant updatedAt) {
        this.id = id; this.lessonId = lessonId; this.courseId = courseId; this.title = title; this.description = description; this.instructions = instructions; this.type = type; this.status = status; this.maxScore = maxScore; this.passingScore = passingScore; this.dueDate = dueDate; this.maxAttempts = maxAttempts; this.allowLateSubmission = allowLateSubmission; this.createdAt = createdAt; this.updatedAt = updatedAt;
    }
    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private UUID id; private UUID lessonId; private UUID courseId; private String title; private String description; private String instructions; private AssignmentType type = AssignmentType.FILE_UPLOAD; private AssignmentStatus status = AssignmentStatus.DRAFT; private Integer maxScore = 100; private Integer passingScore = 60; private Instant dueDate; private Integer maxAttempts = 1; private Boolean allowLateSubmission = false; private Instant createdAt; private Instant updatedAt;
        public Builder id(UUID id) { this.id = id; return this; }
        public Builder lessonId(UUID lessonId) { this.lessonId = lessonId; return this; }
        public Builder courseId(UUID courseId) { this.courseId = courseId; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder instructions(String instructions) { this.instructions = instructions; return this; }
        public Builder type(AssignmentType type) { this.type = type; return this; }
        public Builder status(AssignmentStatus status) { this.status = status; return this; }
        public Builder maxScore(Integer maxScore) { this.maxScore = maxScore; return this; }
        public Builder passingScore(Integer passingScore) { this.passingScore = passingScore; return this; }
        public Builder dueDate(Instant dueDate) { this.dueDate = dueDate; return this; }
        public Builder maxAttempts(Integer maxAttempts) { this.maxAttempts = maxAttempts; return this; }
        public Builder allowLateSubmission(Boolean allowLateSubmission) { this.allowLateSubmission = allowLateSubmission; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }
        public AssignmentJpaEntity build() { return new AssignmentJpaEntity(id, lessonId, courseId, title, description, instructions, type, status, maxScore, passingScore, dueDate, maxAttempts, allowLateSubmission, createdAt, updatedAt); }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "lesson_id")
    private UUID lessonId;

    @Column(name = "course_id")
    private UUID courseId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(255) default 'FILE_UPLOAD'")
    private AssignmentType type = AssignmentType.FILE_UPLOAD;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AssignmentStatus status = AssignmentStatus.DRAFT;

    @Column(name = "max_score")
    private Integer maxScore = 100;

    @Column(name = "passing_score")
    private Integer passingScore = 60;

    @Column(name = "due_date")
    private Instant dueDate;

    @Column(name = "max_attempts")
    private Integer maxAttempts = 1;

    @Column(name = "allow_late_submission")
    private Boolean allowLateSubmission = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    // Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getLessonId() { return lessonId; }
    public void setLessonId(UUID lessonId) { this.lessonId = lessonId; }
    public UUID getCourseId() { return courseId; }
    public void setCourseId(UUID courseId) { this.courseId = courseId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }
    public AssignmentType getType() { return type; }
    public void setType(AssignmentType type) { this.type = type; }
    public AssignmentStatus getStatus() { return status; }
    public void setStatus(AssignmentStatus status) { this.status = status; }
    public Integer getMaxScore() { return maxScore; }
    public void setMaxScore(Integer maxScore) { this.maxScore = maxScore; }
    public Integer getPassingScore() { return passingScore; }
    public void setPassingScore(Integer passingScore) { this.passingScore = passingScore; }
    public Instant getDueDate() { return dueDate; }
    public void setDueDate(Instant dueDate) { this.dueDate = dueDate; }
    public Integer getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(Integer maxAttempts) { this.maxAttempts = maxAttempts; }
    public Boolean getAllowLateSubmission() { return allowLateSubmission; }
    public void setAllowLateSubmission(Boolean allowLateSubmission) { this.allowLateSubmission = allowLateSubmission; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public enum AssignmentType {
        FILE_UPLOAD, TEXT, QUIZ, PROJECT, ESSAY
    }

    public enum AssignmentStatus {
        DRAFT, PUBLISHED, CLOSED, ARCHIVED
    }
}
