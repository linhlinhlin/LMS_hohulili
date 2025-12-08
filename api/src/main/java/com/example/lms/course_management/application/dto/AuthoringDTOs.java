package com.example.lms.course_management.application.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public class AuthoringDTOs {

    @Data
    @Builder
    public static class CourseDraftDTO {
        private UUID id;
        private String code;
        private String title;
        private String description;
        private String thumbnailUrl;
        private BigDecimal price;
        private String priceType;
        private String unlockMode;
        private List<ChapterDraftDTO> chapters;
    }

    @Data
    @Builder
    public static class ChapterDraftDTO {
        private UUID id;
        private String title;
        private Integer orderIndex;
        private List<LessonDraftDTO> lessons;
    }

    @Data
    @Builder
    public static class LessonDraftDTO {
        private UUID id;
        private String title;
        private String type; // VIDEO, QUIZ, etc.
        private Integer orderIndex;

        // Editable Content
        private String contentUrl;
        private String contentHtml; // HTML content from rich text editor (Quill)
        private Integer durationSeconds;
        private boolean isRequired;
    }

    @Data
    public static class ReorderRequest {
        private List<UUID> orderedIds;
    }

    @Data
    public static class UpdateLessonRequest {
        private String title;
        private String contentUrl;
        private String contentHtml; // HTML content from rich text editor (Quill)
        private Integer durationSeconds;
        private Boolean isRequired;
    }
}
