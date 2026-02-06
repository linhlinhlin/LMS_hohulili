package com.example.lms.course_authoring.infrastructure.persistence.mapper;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import org.springframework.stereotype.Component;

/**
 * Mapper for converting between Course domain model and CourseJpaEntity.
 * 
 * This mapper is part of the INFRASTRUCTURE layer and is responsible for
 * translating between the domain model and the JPA entity.
 */
@Component
public class CourseEntityMapper {

    /**
     * Convert domain model to JPA entity.
     */
    public CourseJpaEntity toEntity(Course domain) {
        if (domain == null) {
            return null;
        }

        CourseJpaEntity entity = new CourseJpaEntity();
        entity.setId(domain.getId());
        entity.setCode(domain.getCode() != null ? domain.getCode().getValue() : null);
        entity.setTitle(domain.getTitle());
        entity.setDescription(domain.getDescription());
        entity.setStatus(mapStatusToEntity(domain.getStatus()));
        entity.setTeacherId(domain.getTeacherId());
        entity.setCategoryId(domain.getCategoryId());
        entity.setTags(domain.getTags() != null ? domain.getTags() : new java.util.HashSet<>());
        entity.setWelcomeMessage(domain.getWelcomeMessage());
        entity.setCourseInformation(domain.getCourseInformation());
        entity.setBenefits(domain.getBenefits());
        entity.setIntroVideoUrl(domain.getIntroVideoUrl());
        entity.setCredits(domain.getCredits());
        entity.setVisibility(mapVisibilityToEntity(domain.getVisibility()));
        entity.setPriceType(mapPriceTypeToEntity(domain.getPriceType()));
        entity.setPrice(domain.getPrice());
        entity.setSalePrice(domain.getSalePrice());
        entity.setReviewComment(domain.getReviewComment());
        entity.setReviewedAt(domain.getReviewedAt());
        entity.setReviewedById(domain.getReviewedById());
        return entity;
    }

    /**
     * Map domain CourseStatus (nested enum) to JPA entity CourseStatus.
     */
    private CourseJpaEntity.CourseStatus mapStatusToEntity(Course.CourseStatus domainStatus) {
        if (domainStatus == null) return CourseJpaEntity.CourseStatus.DRAFT;
        return switch (domainStatus) {
            case DRAFT -> CourseJpaEntity.CourseStatus.DRAFT;
            case PENDING -> CourseJpaEntity.CourseStatus.PENDING;
            case APPROVED -> CourseJpaEntity.CourseStatus.APPROVED;
            case REJECTED -> CourseJpaEntity.CourseStatus.REJECTED;
            case PUBLISHED -> CourseJpaEntity.CourseStatus.PUBLISHED;
            case ARCHIVED -> CourseJpaEntity.CourseStatus.ARCHIVED;
        };
    }

    /**
     * Map domain Visibility (nested enum) to JPA entity Visibility.
     */
    private CourseJpaEntity.Visibility mapVisibilityToEntity(Course.Visibility domainVisibility) {
        if (domainVisibility == null) return CourseJpaEntity.Visibility.PUBLIC;
        return switch (domainVisibility) {
            case PUBLIC -> CourseJpaEntity.Visibility.PUBLIC;
            case PRIVATE -> CourseJpaEntity.Visibility.PRIVATE;
        };
    }

    /**
     * Map domain PriceType (nested enum) to JPA entity PriceType.
     */
    private CourseJpaEntity.PriceType mapPriceTypeToEntity(Course.PriceType domainPriceType) {
        if (domainPriceType == null) return CourseJpaEntity.PriceType.FREE;
        return switch (domainPriceType) {
            case FREE -> CourseJpaEntity.PriceType.FREE;
            case PAID -> CourseJpaEntity.PriceType.PAID;
        };
    }

    /**
     * Convert JPA entity to domain model.
     * Uses reflection to reconstruct immutable domain object during migration phase.
     */
    public Course toDomain(CourseJpaEntity entity) {
        if (entity == null) {
            return null;
        }

        try {
            // Create instance using protected constructor
            Course course = Course.class.getDeclaredConstructor().newInstance();

            // Set ID from BaseEntity
            setField(course, "id", entity.getId());

            // Set Course fields using reflection
            setField(course, "code", entity.getCode() != null
                ? com.example.lms.shared.domain.valueobject.CourseCode.of(entity.getCode())
                : null);
            setField(course, "title", entity.getTitle());
            setField(course, "description", entity.getDescription());
            setField(course, "status", mapStatusToDomain(entity.getStatus()));
            setField(course, "teacherId", entity.getTeacherId());
            setField(course, "categoryId", entity.getCategoryId());
            setField(course, "tags", entity.getTags() != null ? new java.util.HashSet<>(entity.getTags()) : new java.util.HashSet<>());
            setField(course, "welcomeMessage", entity.getWelcomeMessage());
            setField(course, "courseInformation", entity.getCourseInformation());
            setField(course, "benefits", entity.getBenefits());
            setField(course, "introVideoUrl", entity.getIntroVideoUrl());
            setField(course, "credits", entity.getCredits());
            setField(course, "visibility", mapVisibilityToDomain(entity.getVisibility()));
            setField(course, "priceType", mapPriceTypeToDomain(entity.getPriceType()));
            setField(course, "price", entity.getPrice());
            setField(course, "salePrice", entity.getSalePrice());
            setField(course, "reviewComment", entity.getReviewComment());
            setField(course, "reviewedAt", entity.getReviewedAt());
            setField(course, "reviewedById", entity.getReviewedById());

            // Set timestamps from BaseEntity
            setField(course, "createdAt", entity.getCreatedAt());
            setField(course, "updatedAt", entity.getUpdatedAt());

            return course;
        } catch (Exception e) {
            throw new RuntimeException("Failed to map CourseJpaEntity to Course domain model", e);
        }
    }

    /**
     * Map JPA entity CourseStatus to domain CourseStatus.
     */
    private Course.CourseStatus mapStatusToDomain(CourseJpaEntity.CourseStatus entityStatus) {
        if (entityStatus == null) return Course.CourseStatus.DRAFT;
        return switch (entityStatus) {
            case DRAFT -> Course.CourseStatus.DRAFT;
            case PENDING -> Course.CourseStatus.PENDING;
            case APPROVED -> Course.CourseStatus.APPROVED;
            case REJECTED -> Course.CourseStatus.REJECTED;
            case PUBLISHED -> Course.CourseStatus.PUBLISHED;
            case ARCHIVED -> Course.CourseStatus.ARCHIVED;
        };
    }

    /**
     * Map JPA entity Visibility to domain Visibility.
     */
    private Course.Visibility mapVisibilityToDomain(CourseJpaEntity.Visibility entityVisibility) {
        if (entityVisibility == null) return Course.Visibility.PUBLIC;
        return switch (entityVisibility) {
            case PUBLIC -> Course.Visibility.PUBLIC;
            case PRIVATE -> Course.Visibility.PRIVATE;
        };
    }

    /**
     * Map JPA entity PriceType to domain PriceType.
     */
    private Course.PriceType mapPriceTypeToDomain(CourseJpaEntity.PriceType entityPriceType) {
        if (entityPriceType == null) return Course.PriceType.FREE;
        return switch (entityPriceType) {
            case FREE -> Course.PriceType.FREE;
            case PAID -> Course.PriceType.PAID;
        };
    }

    /**
     * Reflection helper to set private fields during domain object reconstruction.
     */
    private void setField(Object target, String fieldName, Object value) throws Exception {
        java.lang.reflect.Field field;
        try {
            // Try in Course class first
            field = Course.class.getDeclaredField(fieldName);
        } catch (NoSuchFieldException e) {
            // Try in BaseEntity superclass
            field = com.example.lms.shared.domain.model.BaseEntity.class.getDeclaredField(fieldName);
        }
        field.setAccessible(true);
        field.set(target, value);
    }
}
