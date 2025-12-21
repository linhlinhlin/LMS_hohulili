package com.example.lms.course_authoring.application.dto;

import com.example.lms.course_authoring.domain.model.Chapter;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Response DTO for chapter data.
 */
public record ChapterResponse(
    UUID id,
    String title,
    String description,
    Integer orderIndex,
    int lessonCount,
    List<LessonResponse> lessons,
    Instant createdAt,
    Instant updatedAt
) {
    /**
     * Create ChapterResponse from Chapter entity (without lessons).
     */
    public static ChapterResponse from(Chapter chapter) {
        return new ChapterResponse(
            chapter.getId(),
            chapter.getTitle(),
            chapter.getDescription(),
            chapter.getOrderIndex(),
            chapter.getLessonCount(),
            null,
            chapter.getCreatedAt(),
            chapter.getUpdatedAt()
        );
    }

    /**
     * Create ChapterResponse from Chapter entity (with lessons).
     */
    public static ChapterResponse fromWithLessons(Chapter chapter) {
        List<LessonResponse> lessonResponses = chapter.getLessons().stream()
            .map(LessonResponse::from)
            .collect(Collectors.toList());

        return new ChapterResponse(
            chapter.getId(),
            chapter.getTitle(),
            chapter.getDescription(),
            chapter.getOrderIndex(),
            chapter.getLessonCount(),
            lessonResponses,
            chapter.getCreatedAt(),
            chapter.getUpdatedAt()
        );
    }
}
