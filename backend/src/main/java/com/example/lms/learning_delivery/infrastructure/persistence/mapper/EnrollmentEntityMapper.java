package com.example.lms.learning_delivery.infrastructure.persistence.mapper;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

/**
 * Mapper for Enrollment entity.
 */
@Component
public class EnrollmentEntityMapper {

    public EnrollmentJpaEntity toEntity(
            UUID classId,
            UUID studentId,
            EnrollmentJpaEntity.EnrollmentStatus status
    ) {
        return EnrollmentJpaEntity.builder()
            .classId(classId)
            .studentId(studentId)
            .status(status != null ? status : EnrollmentJpaEntity.EnrollmentStatus.ACTIVE)
            .build();
    }
}
