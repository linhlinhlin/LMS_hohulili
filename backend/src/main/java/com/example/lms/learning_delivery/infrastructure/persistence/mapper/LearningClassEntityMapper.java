package com.example.lms.learning_delivery.infrastructure.persistence.mapper;

import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity;
import org.springframework.stereotype.Component;

/**
 * Mapper for converting between LearningClass domain model and JPA entity.
 * Clean Architecture: Infrastructure layer handles data transformation.
 */
@Component
public class LearningClassEntityMapper {

    /**
     * Convert domain model to JPA entity for persistence.
     */
    public LearningClassJpaEntity toEntity(LearningClass domain) {
        if (domain == null) return null;

        // Convert domain enums to JPA entity enums
        LearningClassJpaEntity.ScheduleType scheduleType = LearningClassJpaEntity.ScheduleType.CUSTOM;
        if (domain.getScheduleType() != null) {
            try {
                scheduleType = LearningClassJpaEntity.ScheduleType.valueOf(domain.getScheduleType().name());
            } catch (IllegalArgumentException ignored) {}
        }

        LearningClassJpaEntity.VersionMode versionMode = LearningClassJpaEntity.VersionMode.PINNED;
        if (domain.getVersionMode() != null) {
            try {
                versionMode = LearningClassJpaEntity.VersionMode.valueOf(domain.getVersionMode().name());
            } catch (IllegalArgumentException ignored) {}
        }

        LearningClassJpaEntity.ClassStatus status = LearningClassJpaEntity.ClassStatus.OPEN;
        if (domain.getStatus() != null) {
            try {
                status = LearningClassJpaEntity.ClassStatus.valueOf(domain.getStatus().name());
            } catch (IllegalArgumentException ignored) {}
        }

        return LearningClassJpaEntity.builder()
            .id(domain.getId())
            .name(domain.getName())
            .code(domain.getCode())
            .courseVersionId(domain.getCourseVersionId())
            .versionMode(versionMode)
            .courseId(domain.getCourseId())
            .teacherId(domain.getTeacherId())
            .startDate(domain.getStartDate())
            .endDate(domain.getEndDate())
            .scheduleType(scheduleType)
            .semester(domain.getSemester())
            .status(status)
            .maxStudents(domain.getMaxStudents() != null ? domain.getMaxStudents() : 9999)
            .createdAt(domain.getCreatedAt())
            .updatedAt(domain.getUpdatedAt())
            .build();
    }

    /**
     * Convert JPA entity to domain model.
     */
    public LearningClass toDomain(LearningClassJpaEntity entity) {
        if (entity == null) return null;

        // Convert JPA entity enums to domain enums
        LearningClass.ScheduleType scheduleType = LearningClass.ScheduleType.CUSTOM;
        if (entity.getScheduleType() != null) {
            try {
                scheduleType = LearningClass.ScheduleType.valueOf(entity.getScheduleType().name());
            } catch (IllegalArgumentException ignored) {}
        }

        LearningClass.VersionMode versionMode = LearningClass.VersionMode.PINNED;
        if (entity.getVersionMode() != null) {
            try {
                versionMode = LearningClass.VersionMode.valueOf(entity.getVersionMode().name());
            } catch (IllegalArgumentException ignored) {}
        }

        LearningClass.ClassStatus status = LearningClass.ClassStatus.OPEN;
        if (entity.getStatus() != null) {
            try {
                status = LearningClass.ClassStatus.valueOf(entity.getStatus().name());
            } catch (IllegalArgumentException ignored) {}
        }

        return LearningClass.builder()
            .id(entity.getId())
            .name(entity.getName())
            .code(entity.getCode())
            .courseVersionId(entity.getCourseVersionId())
            .versionMode(versionMode)
            .courseId(entity.getCourseId())
            .teacherId(entity.getTeacherId())
            .startDate(entity.getStartDate())
            .endDate(entity.getEndDate())
            .scheduleType(scheduleType)
            .semester(entity.getSemester())
            .status(status)
            .maxStudents(entity.getMaxStudents())
            .createdAt(entity.getCreatedAt())
            .updatedAt(entity.getUpdatedAt())
            .build();
    }
}
