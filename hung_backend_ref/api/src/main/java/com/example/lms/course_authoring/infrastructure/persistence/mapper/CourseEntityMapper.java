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
}
