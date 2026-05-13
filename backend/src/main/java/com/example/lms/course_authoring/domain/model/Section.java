package com.example.lms.course_authoring.domain.model;

import com.example.lms.shared.domain.model.BaseEntity;
import java.util.Objects;

/**
 * Section entity representing a content block within a lesson.
 * Sections can be of different types: TEXT, VIDEO, QUIZ, FILE, SIMULATION.
 */
public class Section extends BaseEntity {

    private String title;
    private SectionType type = SectionType.TEXT;
    private String content;
    private String videoUrl;
    private String fileUrl;
    private Integer orderIndex = 0;
    private Integer duration;
    private Boolean isRequired = true;
    private Lesson lesson;

    // Default constructor
    protected Section() {}

    // ==================== Factory Methods ====================

    /**
     * Create a new section within a lesson.
     */
    static Section create(Lesson lesson, String title, SectionType type, int orderIndex) {
        validateTitle(title);
        Objects.requireNonNull(lesson, "Lesson không được để trống");

        Section section = new Section();
        section.lesson = lesson;
        section.title = title.trim();
        section.type = type != null ? type : SectionType.TEXT;
        section.orderIndex = orderIndex;
        return section;
    }

    // ==================== Domain Behavior ====================

    /**
     * Update section basic information.
     */
    public void updateInfo(String title, SectionType type) {
        if (title != null && !title.isBlank()) {
            validateTitle(title);
            this.title = title.trim();
        }
        if (type != null) {
            this.type = type;
        }
    }

    /**
     * Update text content.
     */
    public void updateContent(String content) {
        this.content = content;
    }

    /**
     * Update video URL.
     */
    public void updateVideoUrl(String videoUrl, Integer durationSeconds) {
        this.videoUrl = videoUrl;
        this.duration = durationSeconds;
    }

    /**
     * Update file URL.
     */
    public void updateFileUrl(String fileUrl) {
        this.fileUrl = fileUrl;
    }

    /**
     * Update settings.
     */
    public void updateSettings(Boolean isRequired) {
        if (isRequired != null) {
            this.isRequired = isRequired;
        }
    }

    // ==================== Helper Methods ====================

    void setOrderIndex(int orderIndex) {
        this.orderIndex = orderIndex;
    }

    private static void validateTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Tên section không được để trống");
        }
        if (title.length() > 255) {
            throw new IllegalArgumentException("Tên section không được vượt quá 255 ký tự");
        }
    }

    // ==================== Getters ====================

    public String getTitle() { return title; }
    public SectionType getType() { return type; }
    public String getContent() { return content; }
    public String getVideoUrl() { return videoUrl; }
    public String getFileUrl() { return fileUrl; }
    public Integer getOrderIndex() { return orderIndex; }
    public Integer getDuration() { return duration; }
    public Boolean getIsRequired() { return isRequired; }
    public Lesson getLesson() { return lesson; }

    // ==================== Enums ====================

    public enum SectionType {
        TEXT("Văn bản"),
        VIDEO("Video"),
        SIMULATION("Simulation"),
        QUIZ("Bài kiểm tra"),
        FILE("Tệp đính kèm"),
        EMBED("Nhúng nội dung");

        private final String displayName;

        SectionType(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }
}
