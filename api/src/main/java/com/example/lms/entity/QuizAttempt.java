package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

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
    private Quiz quiz;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
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
}