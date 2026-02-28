package com.example.lms.assessment.infrastructure.persistence.mapper;

import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

/**
 * Mapper for Assignment entity.
 */
@Component
public class AssignmentEntityMapper {

    public AssignmentJpaEntity toEntity(
            UUID lessonId,
            UUID courseId,
            String title,
            String description,
            String instructions,
            AssignmentJpaEntity.AssignmentType type,
            Integer maxScore,
            Integer passingScore,
            Instant dueDate,
            Integer maxAttempts,
            Boolean allowLateSubmission
    ) {
        return AssignmentJpaEntity.builder()
            .lessonId(lessonId)
            .courseId(courseId)
            .title(title)
            .description(description)
            .instructions(instructions)
            .type(type != null ? type : AssignmentJpaEntity.AssignmentType.FILE_UPLOAD)
            .maxScore(maxScore != null ? java.math.BigDecimal.valueOf(maxScore) : java.math.BigDecimal.valueOf(100))
            .passingScore(passingScore != null ? passingScore : 60)
            .dueDate(dueDate)
            .maxAttempts(maxAttempts != null ? maxAttempts : 1)
            .allowLateSubmission(allowLateSubmission != null ? allowLateSubmission : false)
            .build();
    }
}
