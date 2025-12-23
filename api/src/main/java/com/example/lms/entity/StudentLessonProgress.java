package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;
import java.util.UUID;

/**
 * Domain Entity: Student Lesson Progress
 *
 * Tracks individual student's progress on specific lessons.
 * This is the aggregate root for lesson progress tracking.
 *
 * Domain Rules:
 * - Student must be enrolled in the course containing the lesson
 * - Progress can only move forward (NOT_STARTED -> IN_PROGRESS -> COMPLETED)
 * - Completion timestamp is set when status becomes COMPLETED
 */
@Entity
@Table(name = "stu_lesson_progress",
       uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "lesson_id"}))
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@EqualsAndHashCode(callSuper = false, onlyExplicitlyIncluded = true)
public class StudentLessonProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    private UUID id;

    /**
     * The student making progress
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    /**
     * The lesson being progressed on
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    /**
     * Current progress status
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ProgressStatus status = ProgressStatus.NOT_STARTED;

    /**
     * Timestamp when lesson was first started
     */
    @Column(name = "started_at")
    private Instant startedAt;

    /**
     * Timestamp when lesson was completed
     */
    @Column(name = "completed_at")
    private Instant completedAt;

    /**
     * Time spent on lesson in minutes (optional tracking)
     */
    @Column(name = "time_spent_minutes")
    private Integer timeSpentMinutes;

    /**
     * Audit timestamps
     */
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public StudentLessonProgress() {}

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public User getStudent() { return student; }
    public void setStudent(User student) { this.student = student; }
    public Lesson getLesson() { return lesson; }
    public void setLesson(Lesson lesson) { this.lesson = lesson; }
    public ProgressStatus getStatus() { return status; }
    public void setStatus(ProgressStatus status) { this.status = status; }
    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
    public Integer getTimeSpentMinutes() { return timeSpentMinutes; }
    public void setTimeSpentMinutes(Integer timeSpentMinutes) { this.timeSpentMinutes = timeSpentMinutes; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    // Manual Builder
    public static StudentLessonProgressBuilder builder() { return new StudentLessonProgressBuilder(); }
    public static class StudentLessonProgressBuilder {
        private StudentLessonProgress p = new StudentLessonProgress();
        public StudentLessonProgressBuilder id(UUID id) { p.setId(id); return this; }
        public StudentLessonProgressBuilder student(User student) { p.setStudent(student); return this; }
        public StudentLessonProgressBuilder lesson(Lesson lesson) { p.setLesson(lesson); return this; }
        public StudentLessonProgressBuilder status(ProgressStatus status) { p.setStatus(status); return this; }
        public StudentLessonProgressBuilder startedAt(Instant startedAt) { p.setStartedAt(startedAt); return this; }
        public StudentLessonProgressBuilder completedAt(Instant completedAt) { p.setCompletedAt(completedAt); return this; }
        public StudentLessonProgressBuilder timeSpentMinutes(Integer t) { p.setTimeSpentMinutes(t); return this; }
        public StudentLessonProgress build() { return p; }
    }

    /**
     * Domain behavior: Mark lesson as completed
     */
    public void markAsCompleted() {
        if (this.status != ProgressStatus.COMPLETED) {
            this.status = ProgressStatus.COMPLETED;
            this.completedAt = Instant.now();

            // Set started_at if not already set
            if (this.startedAt == null) {
                this.startedAt = this.completedAt;
            }
        }
    }

    /**
     * Domain behavior: Start working on lesson
     */
    public void startProgress() {
        if (this.status == ProgressStatus.NOT_STARTED) {
            this.status = ProgressStatus.IN_PROGRESS;
            this.startedAt = Instant.now();
        }
    }

    /**
     * Business rule: Check if lesson is completed
     */
    public boolean isCompleted() {
        return this.status == ProgressStatus.COMPLETED;
    }

    /**
     * Progress Status Enum
     */
    public enum ProgressStatus {
        NOT_STARTED("Chưa bắt đầu"),
        IN_PROGRESS("Đang học"),
        COMPLETED("Đã hoàn thành");

        private final String displayName;

        ProgressStatus(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }
}
