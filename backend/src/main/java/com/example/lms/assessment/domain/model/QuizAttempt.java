package com.example.lms.assessment.domain.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * QuizAttempt - Aggregate Root for a student's attempt at a quiz.
 * 
 * Manages the lifecycle of an attempt: START -> IN_PROGRESS -> SUBMITTED.
 * Calculates score and pass/fail status.
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
    private Boolean isPassed;

    // Private constructor
    private QuizAttempt(UUID id, UUID quizId, UUID studentId, List<AttemptItem> items, 
                        Instant startTime, Instant endTime, AttemptStatus status, 
                        Double score, Boolean isPassed) {
        this.id = id;
        this.quizId = quizId;
        this.studentId = studentId;
        this.items = items;
        this.startTime = startTime;
        this.endTime = endTime;
        this.status = status;
        this.score = score;
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
        private Boolean isPassed;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder quizId(UUID quizId) { this.quizId = quizId; return this; }
        public Builder studentId(UUID studentId) { this.studentId = studentId; return this; }
        public Builder items(List<AttemptItem> items) { this.items = items; return this; }
        public Builder startTime(Instant startTime) { this.startTime = startTime; return this; }
        public Builder endTime(Instant endTime) { this.endTime = endTime; return this; }
        public Builder status(AttemptStatus status) { this.status = status; return this; }
        public Builder score(Double score) { this.score = score; return this; }
        public Builder isPassed(Boolean isPassed) { this.isPassed = isPassed; return this; }

        public QuizAttempt build() {
            return new QuizAttempt(id, quizId, studentId, items, startTime, endTime, status, score, isPassed);
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
        
        // Initialize blank items for tracking
        questionIds.forEach(qId -> attempt.items.add(AttemptItem.builder()
                .questionId(qId)
                .build()));
        
        return attempt;
    }

    public void submit(List<AttemptAnswer> answers, Integer passingScore) {
        if (this.status != AttemptStatus.IN_PROGRESS) {
             throw new IllegalStateException("Attempt already submitted");
        }

        this.endTime = Instant.now();
        this.status = AttemptStatus.SUBMITTED;
        
        // Grading logic should be handled by UseCase utilizing Domain Service or here if we have Question data.
        // Since Attempt doesn't know 'Correct Answer' directly without Question lookup, 
        // we might need to pass a Grader or graded results.
        // For pure DDD, we can store 'answers' here and let a Domain Service calculate score.
    }
    
    /**
     * Marks this attempt as timed out.
     * Called when server detects elapsed time exceeds the quiz time limit + grace period.
     * Grading still proceeds to give partial credit for submitted answers.
     */
    public void markTimeout() {
        this.endTime = Instant.now();
        this.status = AttemptStatus.TIMEOUT;
    }

    // Simplification: Let UseCase grade it and update the Attempt
    public void finishGrading(Double score, Boolean isPassed) {
        this.score = score;
        this.isPassed = isPassed;
    }
    
    // Getters
    public UUID getId() { return id; }
    public UUID getQuizId() { return quizId; }
    public UUID getStudentId() { return studentId; }
    public List<AttemptItem> getItems() { return items; }
    public Instant getStartTime() { return startTime; }
    public Instant getEndTime() { return endTime; }
    public AttemptStatus getStatus() { return status; }
    public Double getScore() { return score; }
    public Boolean getIsPassed() { return isPassed; }

    
    public static class AttemptItem {
        private UUID questionId;
        private String selectedOption; // Legacy: kept for backward compat with existing data
        private Map<String, Object> studentAnswer; // New: flexible answer format (JSONB)
        private Boolean isCorrect;
        private Double pointsEarned;

        private AttemptItem(UUID questionId, String selectedOption, Map<String, Object> studentAnswer, Boolean isCorrect, Double pointsEarned) {
            this.questionId = questionId;
            this.selectedOption = selectedOption;
            this.studentAnswer = studentAnswer;
            this.isCorrect = isCorrect;
            this.pointsEarned = pointsEarned;
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

            public Builder questionId(UUID questionId) { this.questionId = questionId; return this; }
            public Builder selectedOption(String selectedOption) { this.selectedOption = selectedOption; return this; }
            public Builder studentAnswer(Map<String, Object> studentAnswer) { this.studentAnswer = studentAnswer; return this; }
            public Builder isCorrect(Boolean isCorrect) { this.isCorrect = isCorrect; return this; }
            public Builder pointsEarned(Double pointsEarned) { this.pointsEarned = pointsEarned; return this; }

            public AttemptItem build() {
                return new AttemptItem(questionId, selectedOption, studentAnswer, isCorrect, pointsEarned);
            }
        }

        public UUID getQuestionId() { return questionId; }
        public String getSelectedOption() { return selectedOption; }
        public Map<String, Object> getStudentAnswer() { return studentAnswer; }
        public Boolean getIsCorrect() { return isCorrect; }
        public Double getPointsEarned() { return pointsEarned; }
    }
    
    public static class AttemptAnswer {
        private UUID questionId;
        private String selectedOption; // Legacy: single choice backward compat
        private Map<String, Object> studentAnswer; // New: flexible answer format

        private AttemptAnswer(UUID questionId, String selectedOption, Map<String, Object> studentAnswer) {
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

        /** Get the effective answer - prefer studentAnswer, fall back to selectedOption for legacy data */
        public Map<String, Object> getEffectiveAnswer() {
            if (studentAnswer != null && !studentAnswer.isEmpty()) {
                return studentAnswer;
            }
            // Legacy: wrap selectedOption into map
            if (selectedOption != null) {
                return Map.of("selectedOption", selectedOption);
            }
            return Map.of();
        }
    }
}
