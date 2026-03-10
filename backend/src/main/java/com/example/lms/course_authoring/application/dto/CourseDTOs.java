package com.example.lms.course_authoring.application.dto;

import java.math.BigDecimal;
import java.util.UUID;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
        @NotNull(message = "Danh mục không được để trống")
        private UUID categoryId;

        @NotBlank(message = "Tên khóa học không được để trống")
        @Size(max = 255)
        private String title;

        private String description;

        private String deliveryMode; // SELF_PACED (default) or INSTRUCTOR_LED
        private String priceType;
        private BigDecimal price;
        private BigDecimal salePrice;
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
        private BigDecimal salePrice;
        private String priceType;
        private String thumbnailUrl;
        private String level;
        private String status;
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
        private String code;
        private String title;
        private String slug;
        private String description;
        private String thumbnail;
        private BigDecimal price;
        private String status;
        private String level;
        private String deliveryMode;
        private String categoryName;
        private String createdAt;
        private String updatedAt;
        private int enrolledCount;
        private int studentsCount;
        private double averageRating;
        private int sectionCount;
        private int lessonCount;
    }
}
