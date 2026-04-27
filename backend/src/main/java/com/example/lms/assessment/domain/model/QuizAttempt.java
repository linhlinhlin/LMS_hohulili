package com.example.lms.assessment.domain.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * QuizAttempt - Aggregate Root for a student's attempt at a quiz.
 *
 * Manages the lifecycle of an attempt: START -> IN_PROGRESS -> SUBMITTED/GRADED/TIMEOUT.
 */
public class QuizAttempt {
    private UUID id;
    private UUID quizId;
    private UUID studentId;
    private List<AttemptItem> items;

    private Instant startTime;
    private Instant endTime;

    private AttemptStatus status;
    private Double score;
    private Double maxScore;
    private Boolean isPassed;

    private QuizAttempt(UUID id, UUID quizId, UUID studentId, List<AttemptItem> items,
                        Instant startTime, Instant endTime, AttemptStatus status,
                        Double score, Double maxScore, Boolean isPassed) {
        this.id = id;
        this.quizId = quizId;
        this.studentId = studentId;
        this.items = items != null ? items : new ArrayList<>();
        this.startTime = startTime;
        this.endTime = endTime;
        this.status = status;
        this.score = score;
        this.maxScore = maxScore != null ? maxScore : 10.0;
        this.isPassed = isPassed;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private UUID id;
        private UUID quizId;
        private UUID studentId;
        private List<AttemptItem> items;
        private Instant startTime;
        private Instant endTime;
        private AttemptStatus status;
        private Double score;
        private Double maxScore;
        private Boolean isPassed;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder quizId(UUID quizId) { this.quizId = quizId; return this; }
        public Builder studentId(UUID studentId) { this.studentId = studentId; return this; }
        public Builder items(List<AttemptItem> items) { this.items = items; return this; }
        public Builder startTime(Instant startTime) { this.startTime = startTime; return this; }
        public Builder endTime(Instant endTime) { this.endTime = endTime; return this; }
        public Builder status(AttemptStatus status) { this.status = status; return this; }
        public Builder score(Double score) { this.score = score; return this; }
        public Builder maxScore(Double maxScore) { this.maxScore = maxScore; return this; }
        public Builder isPassed(Boolean isPassed) { this.isPassed = isPassed; return this; }

        public QuizAttempt build() {
            return new QuizAttempt(id, quizId, studentId, items, startTime, endTime, status, score, maxScore, isPassed);
        }
    }

    public enum AttemptStatus {
        IN_PROGRESS,
        SUBMITTED,
        GRADED,
        EXPIRED,
        TIMEOUT
    }

    public static QuizAttempt start(UUID quizId, UUID studentId, List<UUID> questionIds) {
        QuizAttempt attempt = QuizAttempt.builder()
                .id(UUID.randomUUID())
                .quizId(quizId)
                .studentId(studentId)
                .startTime(Instant.now())
                .status(AttemptStatus.IN_PROGRESS)
                .items(new ArrayList<>())
                .build();

        questionIds.forEach(qId -> attempt.items.add(AttemptItem.builder()
                .questionId(qId)
                .build()));

        return attempt;
    }

    public void submit(List<AttemptAnswer> answers, Integer passingScore) {
        if (this.status != AttemptStatus.IN_PROGRESS) {
            throw new IllegalStateException("Lần làm bài đã được nộp");
        }

        this.endTime = Instant.now();
        this.status = AttemptStatus.SUBMITTED;
    }

    /**
     * Marks this attempt as timed out while preserving submitted answers for grading.
     */
    public void markTimeout() {
        if (this.status != AttemptStatus.IN_PROGRESS && this.status != AttemptStatus.SUBMITTED) {
            throw new IllegalStateException("Chỉ có thể timeout bài thi đang làm hoặc vừa nộp");
        }
        this.endTime = Instant.now();
        this.status = AttemptStatus.TIMEOUT;
    }

    public void setMaxScore(Double maxScore) {
        this.maxScore = maxScore != null ? maxScore : 10.0;
    }

    public void finishGrading(Double score, Boolean isPassed) {
        double effectiveMaxScore = maxScore != null ? maxScore : 10.0;
        if (score != null && (score < 0 || score > effectiveMaxScore)) {
            String maxScoreLabel = effectiveMaxScore == Math.rint(effectiveMaxScore)
                    ? String.valueOf((int) effectiveMaxScore)
                    : String.valueOf(effectiveMaxScore);
            throw new IllegalArgumentException("Điểm phải nằm trong khoảng 0-" + maxScoreLabel);
        }

        this.score = score;
        this.isPassed = isPassed;
        if (this.status != AttemptStatus.TIMEOUT) {
            this.status = AttemptStatus.GRADED;
        }
    }

    public UUID getId() { return id; }
    public UUID getQuizId() { return quizId; }
    public UUID getStudentId() { return studentId; }
    public List<AttemptItem> getItems() { return items; }
    public Instant getStartTime() { return startTime; }
    public Instant getEndTime() { return endTime; }
    public AttemptStatus getStatus() { return status; }
    public Double getScore() { return score; }
    public Double getMaxScore() { return maxScore; }
    public Boolean getIsPassed() { return isPassed; }

    public static class AttemptItem implements Serializable {
        private static final long serialVersionUID = 1L;
        private UUID questionId;
        private String selectedOption;
        private Map<String, Object> studentAnswer;
        private Boolean isCorrect;
        private Double pointsEarned;
        private String feedback;
        private String correctOption;
        private List<String> correctOptions;

        @JsonCreator
        public AttemptItem(
                @JsonProperty("questionId") UUID questionId,
                @JsonProperty("selectedOption") String selectedOption,
                @JsonProperty("studentAnswer") Map<String, Object> studentAnswer,
                @JsonProperty("isCorrect") Boolean isCorrect,
                @JsonProperty("pointsEarned") Double pointsEarned,
                @JsonProperty("feedback") String feedback,
                @JsonProperty("correctOption") String correctOption,
                @JsonProperty("correctOptions") List<String> correctOptions
        ) {
            this.questionId = questionId;
            this.selectedOption = selectedOption;
            this.studentAnswer = studentAnswer;
            this.isCorrect = isCorrect;
            this.pointsEarned = pointsEarned;
            this.feedback = feedback;
            this.correctOption = correctOption;
            this.correctOptions = correctOptions;
        }

        public static Builder builder() {
            return new Builder();
        }

        public static class Builder {
            private UUID questionId;
            private String selectedOption;
            private Map<String, Object> studentAnswer;
            private Boolean isCorrect;
            private Double pointsEarned;
            private String feedback;
            private String correctOption;
            private List<String> correctOptions;

            public Builder questionId(UUID questionId) { this.questionId = questionId; return this; }
            public Builder selectedOption(String selectedOption) { this.selectedOption = selectedOption; return this; }
            public Builder studentAnswer(Map<String, Object> studentAnswer) { this.studentAnswer = studentAnswer; return this; }
            public Builder isCorrect(Boolean isCorrect) { this.isCorrect = isCorrect; return this; }
            public Builder pointsEarned(Double pointsEarned) { this.pointsEarned = pointsEarned; return this; }
            public Builder feedback(String feedback) { this.feedback = feedback; return this; }
            public Builder correctOption(String correctOption) { this.correctOption = correctOption; return this; }
            public Builder correctOptions(List<String> correctOptions) { this.correctOptions = correctOptions; return this; }

            public AttemptItem build() {
                return new AttemptItem(questionId, selectedOption, studentAnswer, isCorrect, pointsEarned, feedback, correctOption, correctOptions);
            }
        }

        public UUID getQuestionId() { return questionId; }
        public String getSelectedOption() { return selectedOption; }
        public Map<String, Object> getStudentAnswer() { return studentAnswer; }
        public Boolean getIsCorrect() { return isCorrect; }
        public Double getPointsEarned() { return pointsEarned; }
        public String getFeedback() { return feedback; }
        public String getCorrectOption() { return correctOption; }
        public List<String> getCorrectOptions() { return correctOptions; }

        public void setPointsEarned(Double pointsEarned) { this.pointsEarned = pointsEarned; }
        public void setIsCorrect(Boolean isCorrect) { this.isCorrect = isCorrect; }
        public void setFeedback(String feedback) { this.feedback = feedback; }
    }

    public static class AttemptAnswer {
        private UUID questionId;
        private String selectedOption;
        private Map<String, Object> studentAnswer;

        @JsonCreator
        public AttemptAnswer(
                @JsonProperty("questionId") UUID questionId,
                @JsonProperty("selectedOption") String selectedOption,
                @JsonProperty("studentAnswer") Map<String, Object> studentAnswer
        ) {
            this.questionId = questionId;
            this.selectedOption = selectedOption;
            this.studentAnswer = studentAnswer;
        }

        public static Builder builder() {
            return new Builder();
        }

        public static class Builder {
            private UUID questionId;
            private String selectedOption;
            private Map<String, Object> studentAnswer;

            public Builder questionId(UUID questionId) { this.questionId = questionId; return this; }
            public Builder selectedOption(String selectedOption) { this.selectedOption = selectedOption; return this; }
            public Builder studentAnswer(Map<String, Object> studentAnswer) { this.studentAnswer = studentAnswer; return this; }

            public AttemptAnswer build() {
                return new AttemptAnswer(questionId, selectedOption, studentAnswer);
            }
        }

        public UUID getQuestionId() { return questionId; }
        public String getSelectedOption() { return selectedOption; }
        public Map<String, Object> getStudentAnswer() { return studentAnswer; }

        public Map<String, Object> getEffectiveAnswer() {
            if (studentAnswer != null && !studentAnswer.isEmpty()) {
                return studentAnswer;
            }
            if (selectedOption != null) {
                return Map.of("selectedOption", selectedOption);
            }
            return Map.of();
        }
    }
}
