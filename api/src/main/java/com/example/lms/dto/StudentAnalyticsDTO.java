package com.example.lms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for student analytics data
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentAnalyticsDTO {
    
    private Integer totalStudyTimeMinutes;
    private Integer averageSessionTimeMinutes;
    private Integer streakDays;
    private Integer assignmentsCompleted;
    private Integer assignmentsOverdue;
    private Double averageScore;
    private List<String> strongSubjects;
    private List<String> improvementAreas;
    private List<LearningActivityDTO> learningActivity;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LearningActivityDTO {
        private String date;
        private Integer studyTimeMinutes;
        private Integer lessonsCompleted;
    }
}
