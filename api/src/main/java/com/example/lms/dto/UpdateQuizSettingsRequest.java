package com.example.lms.dto;

import lombok.Data;

@Data
public class UpdateQuizSettingsRequest {
    private String title;
    private Integer timeLimitMinutes;
    private Integer maxAttempts;
    private Integer passingScore;
    private Boolean shuffleQuestions;
    private Boolean shuffleOptions;
    private Boolean showResultsImmediately;
    private Boolean showCorrectAnswers;
}
