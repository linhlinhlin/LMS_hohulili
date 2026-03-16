package com.example.lms.assessment.domain.model;

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
public class Quiz {

    private QuizId id;
    private UUID lessonId;
    private String title;
    private String description;
    private QuizSettings settings;
    private AssessmentType assessmentType;
    private boolean countsTowardCertificate;
    private QuizStatus status;
    private java.util.List<QuizQuestion> questions;
    private Instant createdAt;
    private Instant updatedAt;

    // Private constructor
    private Quiz(QuizId id, UUID lessonId, String title, String description, QuizSettings settings,
                 AssessmentType assessmentType, boolean countsTowardCertificate,
                 QuizStatus status, java.util.List<QuizQuestion> questions, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.lessonId = lessonId;
        this.title = title;
        this.description = description;
        this.settings = settings;
        this.assessmentType = normalizeAssessmentType(assessmentType);
        this.countsTowardCertificate = normalizeCountsTowardCertificate(this.assessmentType, countsTowardCertificate);
        this.status = status;
        this.questions = questions;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private QuizId id;
        private UUID lessonId;
        private String title;
        private String description;
        private QuizSettings settings;
        private AssessmentType assessmentType;
        private boolean countsTowardCertificate;
        private QuizStatus status;
        private java.util.List<QuizQuestion> questions;
        private Instant createdAt;
        private Instant updatedAt;

        public Builder id(QuizId id) { this.id = id; return this; }
        public Builder lessonId(UUID lessonId) { this.lessonId = lessonId; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder settings(QuizSettings settings) { this.settings = settings; return this; }
        public Builder assessmentType(AssessmentType assessmentType) { this.assessmentType = assessmentType; return this; }
        public Builder countsTowardCertificate(boolean countsTowardCertificate) { this.countsTowardCertificate = countsTowardCertificate; return this; }
        public Builder status(QuizStatus status) { this.status = status; return this; }
        public Builder questions(java.util.List<QuizQuestion> questions) { this.questions = questions; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }

        public Quiz build() {
            return new Quiz(
                id,
                lessonId,
                title,
                description,
                settings,
                assessmentType,
                countsTowardCertificate,
                status,
                questions,
                createdAt,
                updatedAt
            );
        }
    }

    /**
     * Quiz settings value object.
     */
    public record QuizSettings(
        Integer timeLimitMinutes,
        Integer maxAttempts,
        Integer passingScore,
        Boolean shuffleQuestions,
        Boolean shuffleOptions,
        Boolean showResultsImmediately,
        Boolean showCorrectAnswers,
        Instant availableFrom,
        Instant dueAt,
        Instant lockAt
    ) {
        public QuizSettings {
            if (timeLimitMinutes != null && timeLimitMinutes <= 0) {
                throw new IllegalArgumentException("Thời gian giới hạn phải lớn hơn 0");
            }
            if (maxAttempts != null && maxAttempts <= 0) {
                throw new IllegalArgumentException("Số lần làm bài tối đa phải lớn hơn 0");
            }
            if (passingScore != null && (passingScore < 0 || passingScore > 100)) {
                throw new IllegalArgumentException("Điểm đậu phải nằm trong khoảng 0-100");
            }
            if (availableFrom != null && lockAt != null && !availableFrom.isBefore(lockAt)) {
                throw new IllegalArgumentException("Thời gian mở phải trước thời gian khóa");
            }
            if (dueAt != null && availableFrom != null && dueAt.isBefore(availableFrom)) {
                throw new IllegalArgumentException("Hạn nộp phải sau thời gian mở");
            }
            if (dueAt != null && lockAt != null && dueAt.isAfter(lockAt)) {
                throw new IllegalArgumentException("Hạn nộp phải trước thời gian khóa");
            }
        }

        public static Builder builder() {
            return new Builder();
        }

        public static class Builder {
            private Integer timeLimitMinutes;
            private Integer maxAttempts;
            private Integer passingScore;
            private Boolean shuffleQuestions;
            private Boolean shuffleOptions;
            private Boolean showResultsImmediately;
            private Boolean showCorrectAnswers;
            private Instant availableFrom;
            private Instant dueAt;
            private Instant lockAt;

            public Builder timeLimitMinutes(Integer timeLimitMinutes) { this.timeLimitMinutes = timeLimitMinutes; return this; }
            public Builder maxAttempts(Integer maxAttempts) { this.maxAttempts = maxAttempts; return this; }
            public Builder passingScore(Integer passingScore) { this.passingScore = passingScore; return this; }
            public Builder shuffleQuestions(Boolean shuffleQuestions) { this.shuffleQuestions = shuffleQuestions; return this; }
            public Builder shuffleOptions(Boolean shuffleOptions) { this.shuffleOptions = shuffleOptions; return this; }
            public Builder showResultsImmediately(Boolean showResultsImmediately) { this.showResultsImmediately = showResultsImmediately; return this; }
            public Builder showCorrectAnswers(Boolean showCorrectAnswers) { this.showCorrectAnswers = showCorrectAnswers; return this; }
            public Builder availableFrom(Instant availableFrom) { this.availableFrom = availableFrom; return this; }
            public Builder dueAt(Instant dueAt) { this.dueAt = dueAt; return this; }
            public Builder lockAt(Instant lockAt) { this.lockAt = lockAt; return this; }

            public QuizSettings build() {
                return new QuizSettings(timeLimitMinutes, maxAttempts, passingScore, shuffleQuestions, shuffleOptions, showResultsImmediately, showCorrectAnswers, availableFrom, dueAt, lockAt);
            }
        }

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

    public enum AssessmentType {
        PRACTICE,
        ASSESSMENT,
        EXAM
    }

    // ============ Factory Methods ============

    /**
     * Create a new Quiz with validation.
     */
    public static Quiz create(UUID lessonId, String title, String description, QuizSettings settings) {
        if (lessonId == null) {
            throw new IllegalArgumentException("ID bài học là bắt buộc");
        }
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Tiêu đề bài kiểm tra là bắt buộc");
        }

        return Quiz.builder()
            .id(QuizId.generate())
            .lessonId(lessonId)
            .title(title)
            .description(description)
            .settings(settings != null ? settings : QuizSettings.defaults())
            .assessmentType(AssessmentType.PRACTICE)
            .countsTowardCertificate(false)
            .status(QuizStatus.DRAFT)
            .questions(new java.util.ArrayList<>())
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
            AssessmentType assessmentType,
            boolean countsTowardCertificate,
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
            .assessmentType(assessmentType)
            .countsTowardCertificate(countsTowardCertificate)
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
            throw new IllegalStateException("Không thể phát hành bài kiểm tra đã lưu trữ");
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

    public void updateAssessmentMetadata(AssessmentType assessmentType, boolean countsTowardCertificate) {
        this.assessmentType = normalizeAssessmentType(assessmentType);
        this.countsTowardCertificate = normalizeCountsTowardCertificate(this.assessmentType, countsTowardCertificate);
        this.updatedAt = Instant.now();
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

    // ============ Question Management ============

    public void addQuestion(UUID questionId, Integer displayOrder) {
        if (!isEditable()) {
            throw new IllegalStateException("Không thể thêm câu hỏi vào bài kiểm tra đã phát hành/lưu trữ");
        }
        if (this.questions == null) {
            this.questions = new java.util.ArrayList<>();
        }
        
        // Check for duplicates
        boolean exists = this.questions.stream()
            .anyMatch(q -> q.getQuestionId().equals(questionId));
        if (exists) {
            throw new IllegalArgumentException("Câu hỏi này đã tồn tại trong bài kiểm tra");
        }

        this.questions.add(QuizQuestion.create(this.id.value(), questionId, displayOrder));
        this.updatedAt = Instant.now();
    }

    public void removeQuestion(UUID questionId) {
        if (!isEditable()) {
            throw new IllegalStateException("Không thể xóa câu hỏi từ bài kiểm tra đã phát hành/lưu trữ");
        }
        if (this.questions == null) return;

        this.questions.removeIf(q -> q.getQuestionId().equals(questionId));
        this.updatedAt = Instant.now();
    }

    // Getters
    public QuizId getId() { return id; }
    public UUID getLessonId() { return lessonId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public QuizSettings getSettings() { return settings; }
    public AssessmentType getAssessmentType() { return assessmentType; }
    public boolean isCountsTowardCertificate() { return countsTowardCertificate; }
    public QuizStatus getStatus() { return status; }
    public java.util.List<QuizQuestion> getQuestions() { return questions; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    private static AssessmentType normalizeAssessmentType(AssessmentType assessmentType) {
        return assessmentType != null ? assessmentType : AssessmentType.ASSESSMENT;
    }

    private static boolean normalizeCountsTowardCertificate(AssessmentType assessmentType, boolean countsTowardCertificate) {
        return assessmentType == AssessmentType.EXAM && countsTowardCertificate;
    }
}
