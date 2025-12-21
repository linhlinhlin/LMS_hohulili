package com.example.lms.assessment.domain.model;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

/**
 * Quiz Domain Model - Aggregate Root for quiz functionality.
 * 
 * Following DDD principles:
 * - Rich domain model with business logic
 * - Encapsulates quiz settings and validation rules
 * - Factory method for creation with invariants
 */
@Getter
@Builder
public class Quiz {

    private QuizId id;
    private UUID lessonId;
    private String title;
    private String description;
    private QuizSettings settings;
    private QuizStatus status;
    private Instant createdAt;
    private Instant updatedAt;

    /**
     * Quiz settings value object.
     */
    @Builder
    public record QuizSettings(
        Integer timeLimitMinutes,
        Integer maxAttempts,
        Integer passingScore,
        Boolean shuffleQuestions,
        Boolean shuffleOptions,
        Boolean showResultsImmediately,
        Boolean showCorrectAnswers
    ) {
        public static QuizSettings defaults() {
            return QuizSettings.builder()
                .timeLimitMinutes(30)
                .maxAttempts(3)
                .passingScore(70)
                .shuffleQuestions(false)
                .shuffleOptions(false)
                .showResultsImmediately(true)
                .showCorrectAnswers(false)
                .build();
        }
    }

    public enum QuizStatus {
        DRAFT,
        PUBLISHED,
        ARCHIVED
    }

    // ============ Factory Methods ============

    /**
     * Create a new Quiz with validation.
     */
    public static Quiz create(UUID lessonId, String title, String description, QuizSettings settings) {
        if (lessonId == null) {
            throw new IllegalArgumentException("Lesson ID is required");
        }
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Quiz title is required");
        }

        return Quiz.builder()
            .id(QuizId.generate())
            .lessonId(lessonId)
            .title(title)
            .description(description)
            .settings(settings != null ? settings : QuizSettings.defaults())
            .status(QuizStatus.DRAFT)
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();
    }

    /**
     * Reconstitute from persistence.
     */
    public static Quiz reconstitute(
            QuizId id,
            UUID lessonId,
            String title,
            String description,
            QuizSettings settings,
            QuizStatus status,
            Instant createdAt,
            Instant updatedAt
    ) {
        return Quiz.builder()
            .id(id)
            .lessonId(lessonId)
            .title(title)
            .description(description)
            .settings(settings)
            .status(status)
            .createdAt(createdAt)
            .updatedAt(updatedAt)
            .build();
    }

    // ============ Business Methods ============

    /**
     * Publish the quiz, making it available to students.
     */
    public void publish() {
        if (this.status == QuizStatus.ARCHIVED) {
            throw new IllegalStateException("Cannot publish an archived quiz");
        }
        this.status = QuizStatus.PUBLISHED;
        this.updatedAt = Instant.now();
    }

    /**
     * Archive the quiz.
     */
    public void archive() {
        this.status = QuizStatus.ARCHIVED;
        this.updatedAt = Instant.now();
    }

    /**
     * Update quiz info.
     */
    public void updateInfo(String title, String description) {
        if (title != null && !title.isBlank()) {
            this.title = title;
        }
        if (description != null) {
            this.description = description;
        }
        this.updatedAt = Instant.now();
    }

    /**
     * Update quiz settings.
     */
    public void updateSettings(QuizSettings newSettings) {
        if (newSettings != null) {
            this.settings = newSettings;
            this.updatedAt = Instant.now();
        }
    }

    /**
     * Check if quiz is published.
     */
    public boolean isPublished() {
        return this.status == QuizStatus.PUBLISHED;
    }

    /**
     * Check if quiz is editable.
     */
    public boolean isEditable() {
        return this.status == QuizStatus.DRAFT;
    }
}
