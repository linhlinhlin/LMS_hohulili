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
        private String classId;
        private String className;
        private String distributionType;
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
        /** Teacher uploaded standalone files (PDF/Word/sample) — pattern Google Classroom. */
        private List<InstructionAttachment> instructionAttachments;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InstructionAttachment {
        private String id;
        private String fileName;
        private String fileUrl;
        private Long fileSize;
        private String fileType;
        private String storageKey;
        private Integer displayOrder;
        private String uploadedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateInstructionAttachmentRequest {
        private String fileName;
        private String fileUrl;
        private String storageKey;
        private Long fileSize;
        private String fileType;
        private Integer displayOrder;
    }
}
