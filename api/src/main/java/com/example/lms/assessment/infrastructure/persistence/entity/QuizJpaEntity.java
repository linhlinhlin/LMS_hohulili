package com.example.lms.assessment.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
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
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizJpaEntity {

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
    @Builder.Default
    private Integer maxAttempts = 3;

    @Column(name = "passing_score")
    @Builder.Default
    private Integer passingScore = 60;

    @Column(name = "shuffle_questions")
    @Builder.Default
    private Boolean shuffleQuestions = false;

    @Column(name = "shuffle_options")
    @Builder.Default
    private Boolean shuffleOptions = false;

    @Column(name = "show_results_immediately")
    @Builder.Default
    private Boolean showResultsImmediately = true;

    @Column(name = "show_correct_answers")
    @Builder.Default
    private Boolean showCorrectAnswers = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private QuizStatus status = QuizStatus.DRAFT;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum QuizStatus {
        DRAFT, PUBLISHED, ARCHIVED
    }
}
