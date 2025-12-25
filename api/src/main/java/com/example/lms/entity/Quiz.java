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
@Setter
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

    // Modified: Section instead of Lesson
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id")
    @JsonIgnore
    private Section section;

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

    @Setter
    @Column(name = "time_limit_minutes")
    private Integer timeLimitMinutes; // null means no limit

    @Setter
    @Column(name = "max_attempts", nullable = false)
    @Builder.Default
    private Integer maxAttempts = 1;

    @Setter
    @Column(name = "passing_score", nullable = false)
    @Builder.Default
    private Integer passingScore = 60; // percentage

    @Setter
    @Column(name = "shuffle_questions", nullable = false)
    @Builder.Default
    private Boolean shuffleQuestions = false;

    @Setter
    @Column(name = "shuffle_options", nullable = false)
    @Builder.Default
    private Boolean shuffleOptions = false;

    @Setter
    @Column(name = "show_results_immediately", nullable = false)
    @Builder.Default
    private Boolean showResultsImmediately = true;

    @Setter
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

    public void addQuestion(Question question, int displayOrder) {
        if (!canBeModified()) {
            throw new IllegalStateException("Cannot modify quiz content after it has been published and attempted.");
        }
        UUID expectedCourseId = getExpectedCourseId();
        if (expectedCourseId != null && !question.belongsToCourse(expectedCourseId)) {
            throw new IllegalArgumentException("Question must belong to the same course as the quiz.");
        }
        boolean alreadyExists = this.quizQuestions.stream()
            .anyMatch(qq -> qq.getQuestion().getId().equals(question.getId()));
        if (alreadyExists) {
            throw new IllegalArgumentException("Question already exists in this quiz.");
        }
        QuizQuestion link = QuizQuestion.builder()
            .quiz(this)
            .question(question)
            .displayOrder(displayOrder)
            .build();
        this.quizQuestions.add(link);
    }

    public void removeQuestion(UUID questionId) {
        if (!canBeModified()) {
            throw new IllegalStateException("Cannot remove questions after quiz has been attempted.");
        }
        this.quizQuestions.removeIf(qq -> qq.getQuestion().getId().equals(questionId));
    }

    public void publish() {
        if (this.quizQuestions.isEmpty()) {
            throw new IllegalStateException("Cannot publish quiz without questions.");
        }
        if (this.publishedAt != null) {
            throw new IllegalStateException("Quiz already published.");
        }
        this.publishedAt = Instant.now();
    }

    public boolean canBeModified() {
        if (this.publishedAt == null) {
            return true;
        }
        return this.attempts.isEmpty();
    }

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

    private UUID getExpectedCourseId() {
        if (this.type == QuizType.LESSON_QUIZ && this.section != null) {
            return this.section.getLesson().getChapter().getCourse().getId();
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
