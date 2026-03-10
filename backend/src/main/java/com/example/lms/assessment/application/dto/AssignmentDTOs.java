package com.example.lms.assessment.application.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.Instant;
import java.util.List;
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
        private String deliveryMode;
        private String status;
        private int submissionsCount;
        private int totalStudents;
        private int gradedCount;
        private int pendingCount;
        private Double averageScore;
        private String createdAt;
        private String updatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignmentDetail {
        private String id;
        private String lessonId;
        private String title;
        private String description;
        private String instructions;
        private String dueDate;
        private String courseId;
        private String courseTitle;
        private String deliveryMode;
        private String status;
        private int submissionsCount;
        private int totalStudents;
        private String classId;
        private String className;
        private String distributionType;
        private List<String> allocatedStudentIds;
        private String createdAt;
        private String updatedAt;
        private Double maxScore;
        // attachments etc...
    }
}
