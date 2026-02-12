package com.example.lms.course_authoring.application.dto;

import com.example.lms.course_authoring.domain.model.Course;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

/**
 * Response DTO for course data.
 */
public record CourseResponse(
    UUID id,
    String code,
    String title,
    String description,
    String thumbnailUrl,
    String status,
    String statusDisplayName,
    UUID teacherId,
    UUID categoryId,
    Set<String> tags,
    String welcomeMessage,
    String courseInformation,
    String benefits,
    String introVideoUrl,
    Integer credits,
    String visibility,
    String priceType,
    BigDecimal price,
    BigDecimal salePrice,
    String deliveryMode,
    String reviewComment,
    Instant reviewedAt,
    UUID reviewedById,
    int chapterCount,
    int lessonCount,
    boolean editable,
    boolean published,
    Instant createdAt,
    Instant updatedAt
) {
    /**
     * Create CourseResponse from Course entity.
     */
    public static CourseResponse from(Course course) {
        return new CourseResponse(
            course.getId(),
            course.getCode() != null ? course.getCode().getValue() : null,
            course.getTitle(),
            course.getDescription(),
            course.getThumbnailUrl(),
            course.getStatus().name(),
            course.getStatus().getDisplayName(),
            course.getTeacherId(),
            course.getCategoryId(),
            course.getTags(),
            course.getWelcomeMessage(),
            course.getCourseInformation(),
            course.getBenefits(),
            course.getIntroVideoUrl(),
            course.getCredits(),
            course.getVisibility() != null ? course.getVisibility().name() : null,
            course.getPriceType() != null ? course.getPriceType().name() : null,
            course.getPrice(),
            course.getSalePrice(),
            course.getDeliveryMode() != null ? course.getDeliveryMode().name() : "SELF_PACED",
            course.getReviewComment(),
            course.getReviewedAt(),
            course.getReviewedById(),
            course.getChapterCount(),
            course.getTotalLessonCount(),
            course.isEditable(),
            course.isPublished(),
            course.getCreatedAt(),
            course.getUpdatedAt()
        );
    }
}
