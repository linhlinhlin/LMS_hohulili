package com.example.lms.assessment.application.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.Instant;
import java.util.UUID;

public class AssignmentDTOs {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignmentSummary {
        private String id;
        private String title;
        private String description;
        private String dueDate;
        private String courseId;
        private String courseTitle;
        private String status;
        private int submissionsCount;
        private int totalStudents;
        private String createdAt;
        private String updatedAt;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignmentDetail {
        private String id;
        private String title;
        private String description;
        private String instructions;
        private String dueDate;
        private String courseId;
        private String courseTitle;
        private String status;
        private int submissionsCount;
        private int totalStudents;
        private String classId;
        private String className;
        private String createdAt;
        private String updatedAt;
        private Double maxScore;
        // attachments etc...
    }
}
