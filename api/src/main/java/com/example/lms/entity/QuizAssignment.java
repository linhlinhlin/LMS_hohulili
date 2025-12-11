package com.example.lms.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * QuizAssignment Aggregate Root
 * Represents the assignment of a quiz to a student
 * Manages the lifecycle: ASSIGNED → IN_PROGRESS → COMPLETED/OVERDUE
 */
@Entity
@Table(name = "quiz_assignments")
public class QuizAssignment {

    // ============ AGGREGATE ROOT ============

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Reference to Quiz (Definition) - NOT owned by this aggregate
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by", nullable = false)
    private User assignedBy; // Teacher who assigned this quiz

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AssignmentStatus status = AssignmentStatus.ASSIGNED;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt = Instant.now();

    @Column(name = "due_date")
    private Instant dueDate; // Can override quiz.endDate

    @Column(name = "completed_at")
    private Instant completedAt;

    // Aggregate children: Attempts belong to Assignment, not Quiz
    @OneToMany(mappedBy = "assignment", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<QuizAttempt> attempts = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public QuizAssignment() {}

    public QuizAssignment(UUID id, Quiz quiz, User student, User assignedBy, AssignmentStatus status, Instant assignedAt, Instant dueDate, Instant completedAt, List<QuizAttempt> attempts, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.quiz = quiz;
        this.student = student;
        this.assignedBy = assignedBy;
        this.status = status != null ? status : AssignmentStatus.ASSIGNED;
        this.assignedAt = assignedAt != null ? assignedAt : Instant.now();
        this.dueDate = dueDate;
        this.completedAt = completedAt;
        this.attempts = attempts != null ? attempts : new ArrayList<>();
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // ============ DOMAIN METHODS ============

    /**
     * Check if student can start a new attempt
     * @return true if student can start attempt
     */
    public boolean canStartAttempt() {
        // Rule 1: Assignment must be in valid status
        if (status == AssignmentStatus.COMPLETED || status == AssignmentStatus.OVERDUE) {
            return false;
        }

        // Rule 2: Check if overdue
        if (dueDate != null && Instant.now().isAfter(dueDate)) {
            this.status = AssignmentStatus.OVERDUE;
            return false;
        }

        // Rule 3: Check max attempts limit
        long completedAttempts = attempts.stream()
            .filter(a -> a.getEndTime() != null) // Only count submitted attempts
            .count();

        if (completedAttempts >= quiz.getMaxAttempts()) {
            return false;
        }

        return true;
    }

    /**
     * Start a new quiz attempt
     * @return the created QuizAttempt
     * @throws IllegalStateException if cannot start attempt
     */
    public QuizAttempt startAttempt() {
        if (!canStartAttempt()) {
            throw new IllegalStateException("Cannot start new attempt for this assignment.");
        }

        QuizAttempt attempt = QuizAttempt.builder()
            .assignment(this)
            .student(this.student)
            .quiz(this.quiz)
            .startTime(Instant.now())
            .build();

        this.attempts.add(attempt);
        this.status = AssignmentStatus.IN_PROGRESS;

        return attempt;
    }

    /**
     * Mark assignment as completed
     */
    public void markAsCompleted() {
        this.status = AssignmentStatus.COMPLETED;
        this.completedAt = Instant.now();
    }

    /**
     * Get the best attempt (highest score)
     * @return the attempt with highest score, or null if no attempts
     */
    public QuizAttempt getBestAttempt() {
        return attempts.stream()
            .filter(a -> a.getScore() != null)
            .max(Comparator.comparing(QuizAttempt::getScore))
            .orElse(null);
    }

    /**
     * Get the latest attempt
     * @return the most recent attempt, or null if no attempts
     */
    public QuizAttempt getLatestAttempt() {
        return attempts.stream()
            .max(Comparator.comparing(QuizAttempt::getStartTime))
            .orElse(null);
    }

    /**
     * Check if assignment is overdue
     */
    public boolean isOverdue() {
        if (dueDate == null) {
            return false;
        }
        return Instant.now().isAfter(dueDate) && status != AssignmentStatus.COMPLETED;
    }

    /**
     * Update status based on current state
     */
    public void updateStatus() {
        if (isOverdue()) {
            this.status = AssignmentStatus.OVERDUE;
        } else if (status == AssignmentStatus.IN_PROGRESS) {
            // Check if all attempts are completed
            boolean hasOngoingAttempt = attempts.stream()
                .anyMatch(a -> a.getEndTime() == null);
            if (!hasOngoingAttempt) {
                this.status = AssignmentStatus.ASSIGNED;
            }
        }
    }

    // ============ ENUMS ============

    public enum AssignmentStatus {
        ASSIGNED,    // Đã giao, chưa làm
        IN_PROGRESS, // Đang làm
        COMPLETED,   // Đã hoàn thành
        OVERDUE      // Quá hạn
    }

    // Manual Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Quiz getQuiz() { return quiz; }
    public void setQuiz(Quiz quiz) { this.quiz = quiz; }
    public User getStudent() { return student; }
    public void setStudent(User student) { this.student = student; }
    public User getAssignedBy() { return assignedBy; }
    public void setAssignedBy(User assignedBy) { this.assignedBy = assignedBy; }
    public AssignmentStatus getStatus() { return status; }
    public void setStatus(AssignmentStatus status) { this.status = status; }
    public Instant getAssignedAt() { return assignedAt; }
    public void setAssignedAt(Instant assignedAt) { this.assignedAt = assignedAt; }
    public Instant getDueDate() { return dueDate; }
    public void setDueDate(Instant dueDate) { this.dueDate = dueDate; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
    public List<QuizAttempt> getAttempts() { return attempts; }
    public void setAttempts(List<QuizAttempt> attempts) { this.attempts = attempts; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    // Manual Builder
    public static QuizAssignmentBuilder builder() { return new QuizAssignmentBuilder(); }
    public static class QuizAssignmentBuilder {
        private QuizAssignment a = new QuizAssignment();
        public QuizAssignmentBuilder id(UUID i) { a.setId(i); return this; }
        public QuizAssignmentBuilder quiz(Quiz q) { a.setQuiz(q); return this; }
        public QuizAssignmentBuilder student(User s) { a.setStudent(s); return this; }
        public QuizAssignmentBuilder assignedBy(User u) { a.setAssignedBy(u); return this; }
        public QuizAssignmentBuilder status(AssignmentStatus s) { a.setStatus(s); return this; }
        public QuizAssignmentBuilder assignedAt(Instant at) { a.setAssignedAt(at); return this; }
        public QuizAssignmentBuilder dueDate(Instant d) { a.setDueDate(d); return this; }
        public QuizAssignmentBuilder completedAt(Instant c) { a.setCompletedAt(c); return this; }
        public QuizAssignmentBuilder attempts(List<QuizAttempt> at) { a.setAttempts(at); return this; }
        public QuizAssignmentBuilder createdAt(Instant c) { a.setCreatedAt(c); return this; }
        public QuizAssignmentBuilder updatedAt(Instant u) { a.setUpdatedAt(u); return this; }
        public QuizAssignment build() { return a; }
    }
}
