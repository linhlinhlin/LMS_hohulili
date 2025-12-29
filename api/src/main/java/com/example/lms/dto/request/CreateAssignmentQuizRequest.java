package com.example.lms.dto.request;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Request DTO for creating an assignment quiz
 * Used when creating standalone quiz for homework/assignment
 */
public class CreateAssignmentQuizRequest {

    @NotNull(message = "Course ID is required")
    private UUID courseId;

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
    private Integer maxAttempts = 3;

    @NotNull(message = "Passing score is required")
    @Min(value = 0, message = "Passing score must be between 0 and 100")
    @Max(value = 100, message = "Passing score must be between 0 and 100")
    private Integer passingScore = 60;

    private Boolean shuffleQuestions = true;

    private Boolean shuffleOptions = false;

    private Boolean showResultsImmediately = true;

    private Boolean showCorrectAnswers = true;

    private Instant startDate;

    private Instant endDate;

    // Question Selection
    @NotEmpty(message = "At least one question is required")
    private List<UUID> questionIds;

    private Boolean publishImmediately = true;

    private UUID classId;

    public CreateAssignmentQuizRequest() {}

    public CreateAssignmentQuizRequest(UUID courseId, String title, String description, Integer timeLimitMinutes, Integer maxAttempts, Integer passingScore, Boolean shuffleQuestions, Boolean shuffleOptions, Boolean showResultsImmediately, Boolean showCorrectAnswers, Instant startDate, Instant endDate, List<UUID> questionIds, Boolean publishImmediately) {
        this.courseId = courseId;
        this.title = title;
        this.description = description;
        this.timeLimitMinutes = timeLimitMinutes;
        this.maxAttempts = maxAttempts != null ? maxAttempts : 3;
        this.passingScore = passingScore != null ? passingScore : 60;
        this.shuffleQuestions = shuffleQuestions != null ? shuffleQuestions : true;
        this.shuffleOptions = shuffleOptions != null ? shuffleOptions : false;
        this.showResultsImmediately = showResultsImmediately != null ? showResultsImmediately : true;
        this.showCorrectAnswers = showCorrectAnswers != null ? showCorrectAnswers : true;
        this.startDate = startDate;
        this.endDate = endDate;
        this.questionIds = questionIds;
        this.publishImmediately = publishImmediately != null ? publishImmediately : true;
    }

    // Getters and Setters
    public UUID getCourseId() { return courseId; }
    public void setCourseId(UUID courseId) { this.courseId = courseId; }
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
    public UUID getClassId() { return classId; }
    public void setClassId(UUID classId) { this.classId = classId; }

    // Builder
    public static CreateAssignmentQuizRequestBuilder builder() { return new CreateAssignmentQuizRequestBuilder(); }
    public static class CreateAssignmentQuizRequestBuilder {
        private CreateAssignmentQuizRequest r = new CreateAssignmentQuizRequest();
        public CreateAssignmentQuizRequestBuilder courseId(UUID id) { r.setCourseId(id); return this; }
        public CreateAssignmentQuizRequestBuilder title(String t) { r.setTitle(t); return this; }
        public CreateAssignmentQuizRequestBuilder description(String d) { r.setDescription(d); return this; }
        public CreateAssignmentQuizRequestBuilder timeLimitMinutes(Integer t) { r.setTimeLimitMinutes(t); return this; }
        public CreateAssignmentQuizRequestBuilder maxAttempts(Integer m) { r.setMaxAttempts(m); return this; }
        public CreateAssignmentQuizRequestBuilder passingScore(Integer p) { r.setPassingScore(p); return this; }
        public CreateAssignmentQuizRequestBuilder shuffleQuestions(Boolean s) { r.setShuffleQuestions(s); return this; }
        public CreateAssignmentQuizRequestBuilder shuffleOptions(Boolean s) { r.setShuffleOptions(s); return this; }
        public CreateAssignmentQuizRequestBuilder showResultsImmediately(Boolean s) { r.setShowResultsImmediately(s); return this; }
        public CreateAssignmentQuizRequestBuilder showCorrectAnswers(Boolean s) { r.setShowCorrectAnswers(s); return this; }
        public CreateAssignmentQuizRequestBuilder startDate(Instant s) { r.setStartDate(s); return this; }
        public CreateAssignmentQuizRequestBuilder endDate(Instant e) { r.setEndDate(e); return this; }
        public CreateAssignmentQuizRequestBuilder questionIds(List<UUID> q) { r.setQuestionIds(q); return this; }
        public CreateAssignmentQuizRequestBuilder publishImmediately(Boolean p) { r.setPublishImmediately(p); return this; }
        public CreateAssignmentQuizRequestBuilder classId(UUID c) { r.setClassId(c); return this; }
        public CreateAssignmentQuizRequest build() { return r; }
    }
}
