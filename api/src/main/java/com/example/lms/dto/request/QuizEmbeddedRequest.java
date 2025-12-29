package com.example.lms.dto.request;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizEmbeddedRequest {
    private String quizType; // "ASSESSMENT" or "EXAM"
    private Integer timeLimitMinutes;
    private Integer passingScore;
    private Integer maxAttempts;
    private Boolean shuffleQuestions;
    private Boolean shuffleOptions;
    private Boolean showResultsImmediately;
    private List<UUID> questionIds;
}
