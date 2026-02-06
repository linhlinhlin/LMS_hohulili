package com.example.lms.course_authoring.domain.model;

import com.example.lms.shared.domain.model.BaseEntity;
import com.example.lms.shared.domain.model.ContentBlock;
import java.util.*;

/**
 * Lesson entity representing a single learning unit within a chapter.
 * Lessons can be of different types: LECTURE, VIDEO, QUIZ, ASSIGNMENT.
 */
public class Lesson extends BaseEntity {

    private String title;
    private String description;
    private String content;
    private String videoUrl;
    private LessonType lessonType = LessonType.LECTURE;
    private Integer orderIndex = 0;
    private Integer durationMinutes;
    private Boolean isRequired = true;
    private Boolean isPreview = false;
    private Chapter chapter;
    private List<Section> sections = new ArrayList<>();
    private List<ContentBlock> contentBlocks = new ArrayList<>();

    // Default constructor
    protected Lesson() {}

    // ==================== Factory Methods ====================

    /**
     * Create a new lesson within a chapter.
     */
    static Lesson create(Chapter chapter, String title, String description, 
                         LessonType lessonType, int orderIndex) {
        validateTitle(title);
        Objects.requireNonNull(chapter, "Chapter không được để trống");

        Lesson lesson = new Lesson();
        lesson.chapter = chapter;
        lesson.title = title.trim();
        lesson.description = description;
        lesson.lessonType = lessonType != null ? lessonType : LessonType.LECTURE;
        lesson.orderIndex = orderIndex;
        return lesson;
    }

    // ==================== Domain Behavior ====================

    /**
     * Update lesson basic information.
     */
    public void updateInfo(String title, String description, LessonType lessonType) {
        if (title != null && !title.isBlank()) {
            validateTitle(title);
            this.title = title.trim();
        }
        this.description = description;
        if (lessonType != null) {
            this.lessonType = lessonType;
        }
    }

    /**
     * Update lesson content (for LECTURE type).
     */
    public void updateContent(String content) {
        this.content = content;
    }

    /**
     * Update lesson video URL (for VIDEO type).
     */
    public void updateVideoUrl(String videoUrl) {
        this.videoUrl = videoUrl;
    }

    /**
     * Update lesson settings.
     */
    public void updateSettings(Integer durationMinutes, Boolean isRequired, Boolean isPreview) {
        this.durationMinutes = durationMinutes;
        if (isRequired != null) {
            this.isRequired = isRequired;
        }
        if (isPreview != null) {
            this.isPreview = isPreview;
        }
    }

    /**
     * Add a new section to this lesson.
     */
    public Section addSection(String title, Section.SectionType sectionType) {
        int orderIndex = sections.size();
        Section section = Section.create(this, title, sectionType, orderIndex);
        sections.add(section);
        return section;
    }

    /**
     * Remove a section from this lesson.
     */
    public void removeSection(UUID sectionId) {
        sections.removeIf(s -> s.getId().equals(sectionId));
        reorderSections();
    }

    // ==================== Helper Methods ====================

    void setOrderIndex(int orderIndex) {
        this.orderIndex = orderIndex;
    }

    private void reorderSections() {
        for (int i = 0; i < sections.size(); i++) {
            sections.get(i).setOrderIndex(i);
        }
    }

    private static void validateTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Tên bài học không được để trống");
        }
        if (title.length() > 255) {
            throw new IllegalArgumentException("Tên bài học không được vượt quá 255 ký tự");
        }
    }

    // ==================== Query Methods ====================

    public int getSectionCount() {
        return sections.size();
    }

    public boolean hasVideo() {
        return videoUrl != null && !videoUrl.isBlank();
    }

    public boolean hasContent() {
        return content != null && !content.isBlank();
    }

    // ==================== Getters ====================

    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getContent() { return content; }
    public String getVideoUrl() { return videoUrl; }
    public LessonType getLessonType() { return lessonType; }
    public Integer getOrderIndex() { return orderIndex; }
    public Integer getDurationMinutes() { return durationMinutes; }
    public Boolean getIsRequired() { return isRequired; }
    public Boolean getIsPreview() { return isPreview; }
    public Chapter getChapter() { return chapter; }
    public List<Section> getSections() { return Collections.unmodifiableList(sections); }
    public List<ContentBlock> getContentBlocks() { return contentBlocks; }

    // ==================== Enums ====================

    public enum LessonType {
        LECTURE("Bài giảng"),
        VIDEO("Video"),
        QUIZ("Bài kiểm tra"),
        ASSIGNMENT("Bài tập"),
        READING("Tài liệu đọc"),
        DISCUSSION("Thảo luận");

        private final String displayName;

        LessonType(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }
}
