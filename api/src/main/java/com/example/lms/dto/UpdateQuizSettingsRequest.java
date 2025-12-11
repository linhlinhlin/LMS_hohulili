package com.example.lms.dto;

public class UpdateQuizSettingsRequest {
    private String title;
    private Integer timeLimitMinutes;
    private Integer maxAttempts;
    private Integer passingScore;
    private Boolean shuffleQuestions;
    private Boolean shuffleOptions;
    private Boolean showResultsImmediately;
    private Boolean showCorrectAnswers;

    public UpdateQuizSettingsRequest() {}

    public UpdateQuizSettingsRequest(String title, Integer timeLimitMinutes, Integer maxAttempts, Integer passingScore, Boolean shuffleQuestions, Boolean shuffleOptions, Boolean showResultsImmediately, Boolean showCorrectAnswers) {
        this.title = title;
        this.timeLimitMinutes = timeLimitMinutes;
        this.maxAttempts = maxAttempts;
        this.passingScore = passingScore;
        this.shuffleQuestions = shuffleQuestions;
        this.shuffleOptions = shuffleOptions;
        this.showResultsImmediately = showResultsImmediately;
        this.showCorrectAnswers = showCorrectAnswers;
    }

    // Getters and Setters
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
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
}
