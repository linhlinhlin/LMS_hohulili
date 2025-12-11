package com.example.lms.course_management.application.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.ArrayList;

public class AuthoringDTOs {

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

        // Manual Getters/Setters/Builder
        public UUID getId() { return id; }
        public void setId(UUID id) { this.id = id; }
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getThumbnailUrl() { return thumbnailUrl; }
        public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }
        public BigDecimal getPrice() { return price; }
        public void setPrice(BigDecimal price) { this.price = price; }
        public String getPriceType() { return priceType; }
        public void setPriceType(String priceType) { this.priceType = priceType; }
        public String getUnlockMode() { return unlockMode; }
        public void setUnlockMode(String unlockMode) { this.unlockMode = unlockMode; }
        public List<ChapterDraftDTO> getChapters() { return chapters; }
        public void setChapters(List<ChapterDraftDTO> chapters) { this.chapters = chapters; }

        public static CourseDraftDTOBuilder builder() { return new CourseDraftDTOBuilder(); }
        public static class CourseDraftDTOBuilder {
            private CourseDraftDTO dto = new CourseDraftDTO();
            public CourseDraftDTOBuilder id(UUID id) { dto.setId(id); return this; }
            public CourseDraftDTOBuilder code(String code) { dto.setCode(code); return this; }
            public CourseDraftDTOBuilder title(String title) { dto.setTitle(title); return this; }
            public CourseDraftDTOBuilder description(String d) { dto.setDescription(d); return this; }
            public CourseDraftDTOBuilder thumbnailUrl(String t) { dto.setThumbnailUrl(t); return this; }
            public CourseDraftDTOBuilder price(BigDecimal p) { dto.setPrice(p); return this; }
            public CourseDraftDTOBuilder priceType(String p) { dto.setPriceType(p); return this; }
            public CourseDraftDTOBuilder unlockMode(String u) { dto.setUnlockMode(u); return this; }
            public CourseDraftDTOBuilder chapters(List<ChapterDraftDTO> c) { dto.setChapters(c); return this; }
            public CourseDraftDTO build() { return dto; }
        }
    }

    public static class ChapterDraftDTO {
        private UUID id;
        private String title;
        private Integer orderIndex;
        private List<LessonDraftDTO> lessons;

        // Manual Getters/Setters/Builder
        public UUID getId() { return id; }
        public void setId(UUID id) { this.id = id; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public Integer getOrderIndex() { return orderIndex; }
        public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
        public List<LessonDraftDTO> getLessons() { return lessons; }
        public void setLessons(List<LessonDraftDTO> lessons) { this.lessons = lessons; }

        public static ChapterDraftDTOBuilder builder() { return new ChapterDraftDTOBuilder(); }
        public static class ChapterDraftDTOBuilder {
            private ChapterDraftDTO dto = new ChapterDraftDTO();
            public ChapterDraftDTOBuilder id(UUID id) { dto.setId(id); return this; }
            public ChapterDraftDTOBuilder title(String t) { dto.setTitle(t); return this; }
            public ChapterDraftDTOBuilder orderIndex(Integer o) { dto.setOrderIndex(o); return this; }
            public ChapterDraftDTOBuilder lessons(List<LessonDraftDTO> l) { dto.setLessons(l); return this; }
            public ChapterDraftDTO build() { return dto; }
        }
    }

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

        // Manual Getters/Setters/Builder
        public UUID getId() { return id; }
        public void setId(UUID id) { this.id = id; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public Integer getOrderIndex() { return orderIndex; }
        public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
        public String getContentUrl() { return contentUrl; }
        public void setContentUrl(String contentUrl) { this.contentUrl = contentUrl; }
        public String getContentHtml() { return contentHtml; }
        public void setContentHtml(String contentHtml) { this.contentHtml = contentHtml; }
        public Integer getDurationSeconds() { return durationSeconds; }
        public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }
        public boolean isRequired() { return isRequired; }
        public void setRequired(boolean isRequired) { this.isRequired = isRequired; }

        public static LessonDraftDTOBuilder builder() { return new LessonDraftDTOBuilder(); }
        public static class LessonDraftDTOBuilder {
            private LessonDraftDTO dto = new LessonDraftDTO();
            public LessonDraftDTOBuilder id(UUID id) { dto.setId(id); return this; }
            public LessonDraftDTOBuilder title(String t) { dto.setTitle(t); return this; }
            public LessonDraftDTOBuilder type(String t) { dto.setType(t); return this; }
            public LessonDraftDTOBuilder orderIndex(Integer o) { dto.setOrderIndex(o); return this; }
            public LessonDraftDTOBuilder contentUrl(String c) { dto.setContentUrl(c); return this; }
            public LessonDraftDTOBuilder contentHtml(String c) { dto.setContentHtml(c); return this; }
            public LessonDraftDTOBuilder durationSeconds(Integer d) { dto.setDurationSeconds(d); return this; }
            public LessonDraftDTOBuilder isRequired(boolean r) { dto.setRequired(r); return this; }
            public LessonDraftDTO build() { return dto; }
        }
    }

    public static class ReorderRequest {
        private List<UUID> orderedIds;

        public List<UUID> getOrderedIds() { return orderedIds; }
        public void setOrderedIds(List<UUID> orderedIds) { this.orderedIds = orderedIds; }
    }

    public static class UpdateLessonRequest {
        private String title;
        private String contentUrl;
        private String contentHtml; // HTML content from rich text editor (Quill)
        private Integer durationSeconds;
        private Boolean isRequired;

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getContentUrl() { return contentUrl; }
        public void setContentUrl(String contentUrl) { this.contentUrl = contentUrl; }
        public String getContentHtml() { return contentHtml; }
        public void setContentHtml(String contentHtml) { this.contentHtml = contentHtml; }
        public Integer getDurationSeconds() { return durationSeconds; }
        public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }
        public Boolean getIsRequired() { return isRequired; }
        public void setIsRequired(Boolean isRequired) { this.isRequired = isRequired; }
    }
}
