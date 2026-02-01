package com.example.lms.learning_delivery.infrastructure.persistence.mapper;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

/**
 * Mapper for LearningClass entity.
 */
@Component
public class LearningClassEntityMapper {

    public LearningClassJpaEntity toEntity(
            UUID courseId,
            UUID teacherId,
            String code,
            String name,
            Instant startDate,
            Instant endDate,
            Integer maxStudents
    ) {
        return LearningClassJpaEntity.builder()
            .courseId(courseId)
            .teacherId(teacherId)
            .code(code)
            .name(name)
            .startDate(startDate)
            .endDate(endDate)
            .maxStudents(maxStudents != null ? maxStudents : 30)
            .build();
    }
}
