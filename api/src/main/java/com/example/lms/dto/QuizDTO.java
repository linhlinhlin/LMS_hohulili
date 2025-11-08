package com.example.lms.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizDTO {
    private UUID id;
    private UUID lessonId;
    private String lessonTitle;
    private UUID sectionId;
    private String sectionTitle;
    private UUID courseId;
    private String courseTitle;
    private String courseCode;
    
    private Integer timeLimitMinutes;
    private Integer maxAttempts;
    private Integer passingScore;
    private Boolean shuffleQuestions;
    private Boolean shuffleOptions;
    private Boolean showResultsImmediately;
    private Boolean showCorrectAnswers;
    private Instant startDate;
    private Instant endDate;
    
    // Selection criteria
    private String questionIds;
    private Integer randomCount;
    private String randomDifficulties;
    private String randomTags;
    
    private Instant createdAt;
    private Instant updatedAt;
    
    // Summary info
    private Integer totalAttempts;
    private Double averageScore;
}