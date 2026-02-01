package com.example.lms.course_management.application.dto;

import java.math.BigDecimal;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

public class CourseDTOs {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateCourseRequest {
        private String code;
        private String title;
        private String description;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateCourseRequest {
        private String code;
        private String title;
        private String description;
        private BigDecimal price;
        private String priceType;
        private String thumbnailUrl;
        private String level;
        private String status; // Allow status update? Usually via dedicated API.
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CourseReviewStatusDTO {
        private String courseId;
        private String status;
        private String reviewComment;
        private String reviewedAt;
        private String reviewedByName;
    }
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TeacherCourseResponse {
        private java.util.UUID id;
        private String title;
        private String slug;
        private String description;
        private String thumbnail;
        private BigDecimal price; // Use BigDecimal for Price
        private String status;
        private String level;
        private String createdAt;
        private String updatedAt;
        private int studentsCount;
        private double averageRating;
        private int sectionCount;
        private int lessonCount;
    }
}
