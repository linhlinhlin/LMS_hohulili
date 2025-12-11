package com.example.lms.dto.request;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Request DTO for creating a lesson-bound quiz
 * Used when creating quiz attached to a specific lesson
 */
public class CreateLessonQuizRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    private String description;

    // Quiz Configuration
    @Min(value = 1, message = "Time limit must be at least 1 minute")
    @Max(value = 300, message = "Time limit must not exceed 300 minutes")
    private Integer timeLimitMinutes;

    @NotNull(message = "Max attempts is required")
    @Min(value = 1, message = "Max attempts must be at least 1")
    @Max(value = 10, message = "Max attempts must not exceed 10")
    private Integer maxAttempts = 1;

    @NotNull(message = "Passing score is required")
    @Min(value = 0, message = "Passing score must be between 0 and 100")
    @Max(value = 100, message = "Passing score must be between 0 and 100")
    private Integer passingScore = 60;

    private Boolean shuffleQuestions = false;

    private Boolean shuffleOptions = false;

    private Boolean showResultsImmediately = true;

    private Boolean showCorrectAnswers = false;

    private Instant startDate;

    private Instant endDate;

    // Question Selection
    @NotEmpty(message = "At least one question is required")
    private List<UUID> questionIds;

    private Boolean publishImmediately = false;

    public CreateLessonQuizRequest() {}

    public CreateLessonQuizRequest(String title, String description, Integer timeLimitMinutes, Integer maxAttempts, Integer passingScore, Boolean shuffleQuestions, Boolean shuffleOptions, Boolean showResultsImmediately, Boolean showCorrectAnswers, Instant startDate, Instant endDate, List<UUID> questionIds, Boolean publishImmediately) {
        this.title = title;
        this.description = description;
        this.timeLimitMinutes = timeLimitMinutes;
        this.maxAttempts = maxAttempts;
        this.passingScore = passingScore;
        this.shuffleQuestions = shuffleQuestions;
        this.shuffleOptions = shuffleOptions;
        this.showResultsImmediately = showResultsImmediately;
        this.showCorrectAnswers = showCorrectAnswers;
        this.startDate = startDate;
        this.endDate = endDate;
        this.questionIds = questionIds;
        this.publishImmediately = publishImmediately;
    }

    // Manual Getters/Setters
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Integer getTimeLimitMinutes() { return timeLimitMinutes; }
    public void setTimeLimitMinutes(Integer timeLimitMinutes) { this.timeLimitMinutes = timeLimitMinutes; }
    public Integer getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(Integer maxAttempts) { this.maxAttempts = maxAttempts; }
    public Integer getPassingScore() { return passingScore; }
    public void setPassingScore(Integer passingScore) { this.passingScore = passingScore; }
    public Boolean getShuffleQuestions() { return shuffleQuestions; }
    public void setShuffleQuestions(Boolean shuffleQuestions) { this.shuffleQuestions = shuffleQuestions; }
    public Boolean getShuffleOptions() { return shuffleOptions; }
    public void setShuffleOptions(Boolean shuffleOptions) { this.shuffleOptions = shuffleOptions; }
    public Boolean getShowResultsImmediately() { return showResultsImmediately; }
    public void setShowResultsImmediately(Boolean showResultsImmediately) { this.showResultsImmediately = showResultsImmediately; }
    public Boolean getShowCorrectAnswers() { return showCorrectAnswers; }
    public void setShowCorrectAnswers(Boolean showCorrectAnswers) { this.showCorrectAnswers = showCorrectAnswers; }
    public Instant getStartDate() { return startDate; }
    public void setStartDate(Instant startDate) { this.startDate = startDate; }
    public Instant getEndDate() { return endDate; }
    public void setEndDate(Instant endDate) { this.endDate = endDate; }
    public List<UUID> getQuestionIds() { return questionIds; }
    public void setQuestionIds(List<UUID> questionIds) { this.questionIds = questionIds; }
    public Boolean getPublishImmediately() { return publishImmediately; }
    public void setPublishImmediately(Boolean publishImmediately) { this.publishImmediately = publishImmediately; }

    // Manual Builder
    public static CreateLessonQuizRequestBuilder builder() { return new CreateLessonQuizRequestBuilder(); }
    public static class CreateLessonQuizRequestBuilder {
        private CreateLessonQuizRequest dto = new CreateLessonQuizRequest();
        public CreateLessonQuizRequestBuilder title(String t) { dto.setTitle(t); return this; }
        public CreateLessonQuizRequestBuilder description(String d) { dto.setDescription(d); return this; }
        public CreateLessonQuizRequestBuilder timeLimitMinutes(Integer t) { dto.setTimeLimitMinutes(t); return this; }
        public CreateLessonQuizRequestBuilder maxAttempts(Integer m) { dto.setMaxAttempts(m); return this; }
        public CreateLessonQuizRequestBuilder passingScore(Integer p) { dto.setPassingScore(p); return this; }
        public CreateLessonQuizRequestBuilder shuffleQuestions(Boolean s) { dto.setShuffleQuestions(s); return this; }
        public CreateLessonQuizRequestBuilder shuffleOptions(Boolean s) { dto.setShuffleOptions(s); return this; }
        public CreateLessonQuizRequestBuilder showResultsImmediately(Boolean s) { dto.setShowResultsImmediately(s); return this; }
        public CreateLessonQuizRequestBuilder showCorrectAnswers(Boolean s) { dto.setShowCorrectAnswers(s); return this; }
        public CreateLessonQuizRequestBuilder startDate(Instant s) { dto.setStartDate(s); return this; }
        public CreateLessonQuizRequestBuilder endDate(Instant e) { dto.setEndDate(e); return this; }
        public CreateLessonQuizRequestBuilder questionIds(List<UUID> q) { dto.setQuestionIds(q); return this; }
        public CreateLessonQuizRequestBuilder publishImmediately(Boolean p) { dto.setPublishImmediately(p); return this; }
        public CreateLessonQuizRequest build() { return dto; }
    }
}
