package com.example.lms.course_authoring.application.dto;

import com.example.lms.course_authoring.domain.model.Course;
import java.time.Instant;
import java.util.UUID;

/**
 * Summary response DTO for course list views.
 */
public record CourseSummaryResponse(
    UUID id,
    String code,
    String title,
    String description,
    String status,
    String statusDisplayName,
    UUID teacherId,
    int chapterCount,
    boolean editable,
    boolean published,
    Instant createdAt
) {
    /**
     * Create CourseSummaryResponse from Course entity.
     */
    public static CourseSummaryResponse from(Course course) {
        return new CourseSummaryResponse(
            course.getId(),
            course.getCode() != null ? course.getCode().getValue() : null,
            course.getTitle(),
            course.getDescription(),
            course.getStatus().name(),
            course.getStatus().getDisplayName(),
            course.getTeacherId(),
            course.getChapterCount(),
            course.isEditable(),
            course.isPublished(),
            course.getCreatedAt()
        );
    }
}
