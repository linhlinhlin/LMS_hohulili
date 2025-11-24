package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "quizzes")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Quiz {

    // ============ AGGREGATE ROOT ============

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Setter
    private String title;

    @Setter
    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private QuizType type = QuizType.LESSON_QUIZ;

    // Nullable - only for LESSON_QUIZ type
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id")
    @JsonIgnore
    private Lesson lesson;

    // Nullable - only for ASSIGNMENT type
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    @JsonIgnore
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    @JsonIgnore
    private User createdBy;

    @Column(name = "published_at")
    private Instant publishedAt;

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

    // NOTE: Attempts are now managed by QuizAssignment aggregate
    // This relationship is kept for backward compatibility during migration
    // Will be removed in Phase 3
    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @JsonIgnore
    @Deprecated
    private List<QuizAttempt> attempts = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    @Builder.Default
    @JsonIgnore
    private List<QuizQuestion> quizQuestions = new java.util.ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    // ============ DOMAIN METHODS ============

    /**
     * Add a question to this quiz
     * Invariant: Cannot modify quiz content after it has been published and attempted
     */
    public void addQuestion(Question question, int displayOrder) {
        // Validation 1: Quiz must be modifiable
        if (!canBeModified()) {
            throw new IllegalStateException(
                "Cannot modify quiz content after it has been published and attempted."
            );
        }

        // Validation 2: Question must belong to the same course
        UUID expectedCourseId = getExpectedCourseId();
        if (expectedCourseId != null && !question.belongsToCourse(expectedCourseId)) {
            throw new IllegalArgumentException(
                "Question must belong to the same course as the quiz."
            );
        }

        // Validation 3: No duplicate questions
        boolean alreadyExists = this.quizQuestions.stream()
            .anyMatch(qq -> qq.getQuestion().getId().equals(question.getId()));
        if (alreadyExists) {
            throw new IllegalArgumentException("Question already exists in this quiz.");
        }

        // Create link entity
        QuizQuestion link = QuizQuestion.builder()
            .quiz(this)
            .question(question)
            .displayOrder(displayOrder)
            .build();
        this.quizQuestions.add(link);
    }

    /**
     * Remove a question from this quiz
     */
    public void removeQuestion(UUID questionId) {
        if (!canBeModified()) {
            throw new IllegalStateException(
                "Cannot remove questions after quiz has been attempted."
            );
        }

        this.quizQuestions.removeIf(qq -> qq.getQuestion().getId().equals(questionId));
    }

    /**
     * Publish this quiz (transition from draft to active)
     */
    public void publish() {
        if (this.quizQuestions.isEmpty()) {
            throw new IllegalStateException("Cannot publish quiz without questions.");
        }
        if (this.publishedAt != null) {
            throw new IllegalStateException("Quiz already published.");
        }
        this.publishedAt = Instant.now();
    }

    /**
     * Check if quiz can be modified
     * @return true if quiz is not published or has no attempts
     */
    public boolean canBeModified() {
        // If not published, can always modify
        if (this.publishedAt == null) {
            return true;
        }
        // If published but no attempts, can still modify
        return this.attempts.isEmpty();
    }

    /**
     * Check if quiz is available now (based on time window)
     */
    public boolean isAvailableNow() {
        if (this.publishedAt == null) {
            return false;
        }

        Instant now = Instant.now();
        if (this.startDate != null && now.isBefore(this.startDate)) {
            return false;
        }
        if (this.endDate != null && now.isAfter(this.endDate)) {
            return false;
        }
        return true;
    }

    /**
     * Get the expected course ID based on quiz type
     */
    private UUID getExpectedCourseId() {
        if (this.type == QuizType.LESSON_QUIZ && this.lesson != null) {
            return this.lesson.getSection().getCourse().getId();
        } else if (this.type == QuizType.ASSIGNMENT && this.course != null) {
            return this.course.getId();
        }
        return null;
    }

    // ============ ENUMS ============

    public enum QuizType {
        LESSON_QUIZ,  // Quiz gắn với lesson
        ASSIGNMENT    // Quiz độc lập (bài tập giao thêm)
    }
}