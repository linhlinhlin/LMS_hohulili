package com.example.lms.course_authoring.application.dto;

import com.example.lms.course_authoring.domain.model.Lesson;
import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for lesson data.
 */
public record LessonResponse(
    UUID id,
    String title,
    String description,
    String content,
    String videoUrl,
    String lessonType,
    Integer orderIndex,
    Integer durationMinutes,
    Boolean isRequired,
    Boolean isPreview,
    int sectionCount,
    Instant createdAt,
    Instant updatedAt
) {
    /**
     * Create LessonResponse from Lesson entity.
     */
    public static LessonResponse from(Lesson lesson) {
        return new LessonResponse(
            lesson.getId(),
            lesson.getTitle(),
            lesson.getDescription(),
            lesson.getContent(),
            lesson.getVideoUrl(),
            lesson.getLessonType() != null ? lesson.getLessonType().name() : null,
            lesson.getOrderIndex(),
            lesson.getDurationMinutes(),
            lesson.getIsRequired(),
            lesson.getIsPreview(),
            lesson.getSectionCount(),
            lesson.getCreatedAt(),
            lesson.getUpdatedAt()
        );
    }

    /**
     * Create LessonResponse without content (for list views).
     */
    public static LessonResponse fromSummary(Lesson lesson) {
        return new LessonResponse(
            lesson.getId(),
            lesson.getTitle(),
            lesson.getDescription(),
            null, // Don't include content in summary
            null, // Don't include video URL in summary
            lesson.getLessonType() != null ? lesson.getLessonType().name() : null,
            lesson.getOrderIndex(),
            lesson.getDurationMinutes(),
            lesson.getIsRequired(),
            lesson.getIsPreview(),
            lesson.getSectionCount(),
            lesson.getCreatedAt(),
            lesson.getUpdatedAt()
        );
    }
}
