package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "quiz_attempts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id", nullable = false)
    @JsonIgnore
    private Quiz quiz;

    // NEW: Assignment relationship (nullable for backward compatibility)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id")
    @JsonIgnore
    private QuizAssignment assignment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    @JsonIgnore
    private User student;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private Status status = Status.IN_PROGRESS;

    @Column(name = "start_time", nullable = false)
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    @Column(name = "time_spent_seconds")
    private Long timeSpentSeconds;

    @Column(name = "score")
    private Double score; // percentage (0.0 to 100.0)

    @Column(name = "total_questions", nullable = false)
    private Integer totalQuestions;

    @Column(name = "correct_answers", nullable = false)
    @Builder.Default
    private Integer correctAnswers = 0;

    @Column(name = "is_passed")
    private Boolean isPassed;

    @Column(name = "question_order", columnDefinition = "TEXT")
    private String questionOrder; // JSON array of question IDs in shuffled order

    @Column(name = "option_orders", columnDefinition = "TEXT")
    private String optionOrders; // JSON object mapping question IDs to shuffled option orders

    @OneToMany(mappedBy = "attempt", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @JsonIgnore
    private List<QuizAttemptItem> items = new java.util.ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum Status {
        IN_PROGRESS, SUBMITTED, EXPIRED
    }

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Quiz getQuiz() { return quiz; }
    public void setQuiz(Quiz quiz) { this.quiz = quiz; }
    public QuizAssignment getAssignment() { return assignment; }
    public void setAssignment(QuizAssignment assignment) { this.assignment = assignment; }
    public User getStudent() { return student; }
    public void setStudent(User student) { this.student = student; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public Instant getStartTime() { return startTime; }
    public void setStartTime(Instant startTime) { this.startTime = startTime; }
    public Instant getEndTime() { return endTime; }
    public void setEndTime(Instant endTime) { this.endTime = endTime; }
    public Long getTimeSpentSeconds() { return timeSpentSeconds; }
    public void setTimeSpentSeconds(Long timeSpentSeconds) { this.timeSpentSeconds = timeSpentSeconds; }
    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }
    public Integer getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(Integer totalQuestions) { this.totalQuestions = totalQuestions; }
    public Integer getCorrectAnswers() { return correctAnswers; }
    public void setCorrectAnswers(Integer correctAnswers) { this.correctAnswers = correctAnswers; }
    public Boolean getIsPassed() { return isPassed; }
    public void setIsPassed(Boolean isPassed) { this.isPassed = isPassed; }
    public String getQuestionOrder() { return questionOrder; }
    public void setQuestionOrder(String questionOrder) { this.questionOrder = questionOrder; }
    public String getOptionOrders() { return optionOrders; }
    public void setOptionOrders(String optionOrders) { this.optionOrders = optionOrders; }
    public List<QuizAttemptItem> getItems() { return items; }
    public void setItems(List<QuizAttemptItem> items) { this.items = items; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    // Manual Builder
    public static QuizAttemptBuilder builder() { return new QuizAttemptBuilder(); }
    public static class QuizAttemptBuilder {
        private QuizAttempt q = new QuizAttempt();
        public QuizAttemptBuilder id(UUID id) { q.setId(id); return this; }
        public QuizAttemptBuilder quiz(Quiz quiz) { q.setQuiz(quiz); return this; }
        public QuizAttemptBuilder assignment(QuizAssignment assignment) { q.setAssignment(assignment); return this; }
        public QuizAttemptBuilder student(User student) { q.setStudent(student); return this; }
        public QuizAttemptBuilder status(Status status) { q.setStatus(status); return this; }
        public QuizAttemptBuilder startTime(Instant startTime) { q.setStartTime(startTime); return this; }
        public QuizAttemptBuilder endTime(Instant endTime) { q.setEndTime(endTime); return this; }
        public QuizAttemptBuilder timeSpentSeconds(Long timeSpentSeconds) { q.setTimeSpentSeconds(timeSpentSeconds); return this; }
        public QuizAttemptBuilder score(Double score) { q.setScore(score); return this; }
        public QuizAttemptBuilder totalQuestions(Integer totalQuestions) { q.setTotalQuestions(totalQuestions); return this; }
        public QuizAttemptBuilder correctAnswers(Integer correctAnswers) { q.setCorrectAnswers(correctAnswers); return this; }
        public QuizAttemptBuilder isPassed(Boolean isPassed) { q.setIsPassed(isPassed); return this; }
        public QuizAttemptBuilder questionOrder(String questionOrder) { q.setQuestionOrder(questionOrder); return this; }
        public QuizAttemptBuilder optionOrders(String optionOrders) { q.setOptionOrders(optionOrders); return this; }
        public QuizAttemptBuilder items(List<QuizAttemptItem> items) { q.setItems(items); return this; }
        public QuizAttemptBuilder createdAt(Instant createdAt) { q.setCreatedAt(createdAt); return this; }
        public QuizAttemptBuilder updatedAt(Instant updatedAt) { q.setUpdatedAt(updatedAt); return this; }
        public QuizAttempt build() { return q; }
    }
}
