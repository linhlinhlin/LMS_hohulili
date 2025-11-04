package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "quizzes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Quiz {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @Column(name = "time_limit_minutes")
    private Integer timeLimitMinutes; // null means no limit

    @Column(name = "max_attempts", nullable = false)
    @Builder.Default
    private Integer maxAttempts = 1;

    @Column(name = "passing_score", nullable = false)
    @Builder.Default
    private Integer passingScore = 60; // percentage

    @Column(name = "shuffle_questions", nullable = false)
    @Builder.Default
    private Boolean shuffleQuestions = false;

    @Column(name = "shuffle_options", nullable = false)
    @Builder.Default
    private Boolean shuffleOptions = false;

    @Column(name = "show_results_immediately", nullable = false)
    @Builder.Default
    private Boolean showResultsImmediately = true;

    @Column(name = "show_correct_answers", nullable = false)
    @Builder.Default
    private Boolean showCorrectAnswers = false;

    @Column(name = "start_date")
    private Instant startDate;

    @Column(name = "end_date")
    private Instant endDate;

    // For manual selection: list of question IDs
    @Column(name = "question_ids", columnDefinition = "TEXT")
    private String questionIds; // JSON array of UUIDs

    // For random selection: filter criteria
    @Column(name = "random_count")
    private Integer randomCount;

    @Column(name = "random_difficulties", columnDefinition = "TEXT")
    private String randomDifficulties; // JSON array of difficulties

    @Column(name = "random_tags", columnDefinition = "TEXT")
    private String randomTags; // JSON array of tags

    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<QuizAttempt> attempts = new java.util.ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}