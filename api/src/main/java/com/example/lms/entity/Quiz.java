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

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public QuizType getType() { return type; }
    public void setType(QuizType type) { this.type = type; }
    public Section getSection() { return section; }
    public void setSection(Section section) { this.section = section; }
    public Course getCourse() { return course; }
    public void setCourse(Course course) { this.course = course; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
    public List<QuizQuestion> getQuizQuestions() { return quizQuestions; }
    public void setQuizQuestions(List<QuizQuestion> quizQuestions) { this.quizQuestions = quizQuestions; }
    public Integer getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(Integer maxAttempts) { this.maxAttempts = maxAttempts; }
    public Integer getPassingScore() { return passingScore; }
    public void setPassingScore(Integer passingScore) { this.passingScore = passingScore; }
    public Integer getTimeLimitMinutes() { return timeLimitMinutes; }
    public void setTimeLimitMinutes(Integer timeLimitMinutes) { this.timeLimitMinutes = timeLimitMinutes; }
    public Boolean getShuffleQuestions() { return shuffleQuestions; }
    public void setShuffleQuestions(Boolean shuffleQuestions) { this.shuffleQuestions = shuffleQuestions; }
    public Boolean getShuffleOptions() { return shuffleOptions; }
    public void setShuffleOptions(Boolean shuffleOptions) { this.shuffleOptions = shuffleOptions; }
    public Boolean getShowResultsImmediately() { return showResultsImmediately; }
    public void setShowResultsImmediately(Boolean showResultsImmediately) { this.showResultsImmediately = showResultsImmediately; }
    public Boolean getShowCorrectAnswers() { return showCorrectAnswers; }
    public void setShowCorrectAnswers(Boolean showCorrectAnswers) { this.showCorrectAnswers = showCorrectAnswers; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant publishedAt) { this.publishedAt = publishedAt; }
    public Instant getStartDate() { return startDate; }
    public void setStartDate(Instant startDate) { this.startDate = startDate; }
    public Instant getEndDate() { return endDate; }
    public void setEndDate(Instant endDate) { this.endDate = endDate; }
    public String getQuestionIds() { return questionIds; }
    public void setQuestionIds(String questionIds) { this.questionIds = questionIds; }
    public Integer getRandomCount() { return randomCount; }
    public void setRandomCount(Integer randomCount) { this.randomCount = randomCount; }
    public String getRandomDifficulties() { return randomDifficulties; }
    public void setRandomDifficulties(String randomDifficulties) { this.randomDifficulties = randomDifficulties; }
    public String getRandomTags() { return randomTags; }
    public void setRandomTags(String randomTags) { this.randomTags = randomTags; }
    public List<QuizAttempt> getAttempts() { return attempts; }
    public void setAttempts(List<QuizAttempt> attempts) { this.attempts = attempts; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    // Manual Quiz Builder
    public static QuizBuilder builder() { return new QuizBuilder(); }
    public static class QuizBuilder {
        private Quiz quiz = new Quiz();
        public QuizBuilder section(Section s) { quiz.setSection(s); return this; }
        public QuizBuilder course(Course c) { quiz.setCourse(c); return this; }
        public QuizBuilder title(String t) { quiz.setTitle(t); return this; }
        public QuizBuilder createdBy(User u) { quiz.setCreatedBy(u); return this; }
        public QuizBuilder timeLimitMinutes(Integer t) { quiz.setTimeLimitMinutes(t); return this; }
        public QuizBuilder maxAttempts(Integer m) { quiz.setMaxAttempts(m); return this; }
        public QuizBuilder passingScore(Integer p) { quiz.setPassingScore(p); return this; }
        public QuizBuilder shuffleQuestions(Boolean s) { quiz.setShuffleQuestions(s); return this; }
        public QuizBuilder shuffleOptions(Boolean s) { quiz.setShuffleOptions(s); return this; }
        public QuizBuilder showResultsImmediately(Boolean s) { quiz.setShowResultsImmediately(s); return this; }
        public QuizBuilder showCorrectAnswers(Boolean s) { quiz.setShowCorrectAnswers(s); return this; }
        public QuizBuilder startDate(Instant s) { quiz.setStartDate(s); return this; }
        public QuizBuilder endDate(Instant e) { quiz.setEndDate(e); return this; }
        public QuizBuilder type(QuizType t) { quiz.setType(t); return this; }
        public QuizBuilder description(String d) { quiz.setDescription(d); return this; }
        public QuizBuilder id(UUID i) { quiz.setId(i); return this; }
        public QuizBuilder randomCount(Integer r) { quiz.setRandomCount(r); return this; }
        public QuizBuilder randomDifficulties(String r) { quiz.setRandomDifficulties(r); return this; }
        public QuizBuilder randomTags(String r) { quiz.setRandomTags(r); return this; }
        public Quiz build() { return quiz; }
    }
}
