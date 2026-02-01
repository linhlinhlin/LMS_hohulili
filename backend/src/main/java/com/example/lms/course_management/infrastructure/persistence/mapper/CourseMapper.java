package com.example.lms.course_management.infrastructure.persistence.mapper;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.course_management.domain.model.Course;
import org.springframework.stereotype.Component;

import java.util.ArrayList;

/**
 * Mapper for Course domain model <-> CourseJpaEntity.
 * 
 * DDD Infrastructure Layer pattern:
 * - Converts between pure domain models and JPA entities
 * - Isolates domain from persistence framework concerns
 */
@Component
public class CourseMapper {

    /**
     * Convert JPA entity to domain model
     */
    public Course toDomain(CourseJpaEntity entity) {
        if (entity == null) return null;
        
        return Course.reconstitute(
                entity.getId(),
                entity.getCode(),
                entity.getTitle(),
                null, // slug - not in CourseJpaEntity
                entity.getDescription(),
                null, // thumbnailUrl - check CourseJpaEntity
                entity.getTeacherId(),
                entity.getCategoryId(),
                entity.getPrice(),
                mapPriceType(entity.getPriceType()),
                null, // prerequisiteCourseId
                null, // unlockMode
                mapStatus(entity.getStatus()),
                new ArrayList<>(), // chapters - loaded separately
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    /**
     * Convert domain model to JPA entity
     */
    public CourseJpaEntity toEntity(Course course) {
        if (course == null) return null;
        
        return CourseJpaEntity.builder()
                .id(course.getId())
                .code(course.getCode())
                .title(course.getTitle())
                .description(course.getDescription())
                .teacherId(course.getTeacherId())
                .categoryId(course.getCategoryId())
                .price(course.getPrice())
                .priceType(mapPriceType(course.getPriceType()))
                .status(mapStatus(course.getStatus()))
                .createdAt(course.getCreatedAt())
                .updatedAt(course.getUpdatedAt())
                .build();
    }

    // ============ ENUM MAPPERS ============
    
    private Course.CoursePriceType mapPriceType(CourseJpaEntity.PriceType priceType) {
        if (priceType == null) return null;
        return switch (priceType) {
            case FREE -> Course.CoursePriceType.FREE;
            case PAID -> Course.CoursePriceType.PAID;
        };
    }

    private CourseJpaEntity.PriceType mapPriceType(Course.CoursePriceType priceType) {
        if (priceType == null) return null;
        return switch (priceType) {
            case FREE -> CourseJpaEntity.PriceType.FREE;
            case PAID -> CourseJpaEntity.PriceType.PAID;
        };
    }

    private Course.CourseStatus mapStatus(CourseJpaEntity.CourseStatus status) {
        if (status == null) return Course.CourseStatus.DRAFT;
        return switch (status) {
            case DRAFT -> Course.CourseStatus.DRAFT;
            case PENDING -> Course.CourseStatus.PENDING;
            case APPROVED -> Course.CourseStatus.APPROVED;
            case REJECTED -> Course.CourseStatus.REJECTED;
        };
    }

    private CourseJpaEntity.CourseStatus mapStatus(Course.CourseStatus status) {
        if (status == null) return CourseJpaEntity.CourseStatus.DRAFT;
        return switch (status) {
            case DRAFT -> CourseJpaEntity.CourseStatus.DRAFT;
            case PENDING -> CourseJpaEntity.CourseStatus.PENDING;
            case APPROVED -> CourseJpaEntity.CourseStatus.APPROVED;
            case REJECTED -> CourseJpaEntity.CourseStatus.REJECTED;
            case ARCHIVED -> CourseJpaEntity.CourseStatus.DRAFT; // No ARCHIVED in JpaEntity
        };
    }
}
