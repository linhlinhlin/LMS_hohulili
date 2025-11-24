package com.example.lms.dto.response;

import com.example.lms.entity.Quiz;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for Quiz
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizResponse {

    private UUID id;
    private String title;
    private String description;
    private Quiz.QuizType type;
    
    // Context references
    private UUID lessonId;
    private String lessonTitle;
    private UUID courseId;
    private String courseTitle;
    
    // Configuration
    private Integer timeLimitMinutes;
    private Integer maxAttempts;
    private Integer passingScore;
    private Boolean shuffleQuestions;
    private Boolean shuffleOptions;
    private Boolean showResultsImmediately;
    private Boolean showCorrectAnswers;
    private Instant startDate;
    private Instant endDate;
    
    // Metadata
    private Integer questionCount;
    private UUID createdBy;
    private String createdByName;
    private Instant publishedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
