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
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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