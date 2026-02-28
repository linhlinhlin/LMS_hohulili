package com.example.lms.learning_delivery.infrastructure.persistence.mapper;

import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/**
 * Mapper for converting between Enrollment domain model and JPA entity.
 * Clean Architecture: Infrastructure layer handles data transformation.
 */
@Component
@RequiredArgsConstructor
public class EnrollmentEntityMapper {

    private final LearningClassEntityMapper learningClassMapper;

    /**
     * Convert domain model to JPA entity for persistence.
     */
    public EnrollmentJpaEntity toEntity(Enrollment domain, LearningClassJpaEntity learningClassEntity) {
        if (domain == null) return null;

        // Convert domain status to JPA entity status
        EnrollmentJpaEntity.EnrollmentStatus status = EnrollmentJpaEntity.EnrollmentStatus.ACTIVE;
        if (domain.getStatus() != null) {
            try {
                status = EnrollmentJpaEntity.EnrollmentStatus.valueOf(domain.getStatus().name());
            } catch (IllegalArgumentException ignored) {
                // Unknown status enum — default to ACTIVE
            }
        }

        // Convert progress map (domain Instant -> JPA String for JSONB)
        Map<String, EnrollmentJpaEntity.LessonProgressData> progressMap = new HashMap<>();
        if (domain.getProgress() != null) {
            domain.getProgress().forEach((lessonId, lessonProgress) -> {
                EnrollmentJpaEntity.LessonProgressData data = EnrollmentJpaEntity.LessonProgressData.builder()
                        .status(lessonProgress.getStatus())
                        .watchSeconds(lessonProgress.getWatchSeconds())
                        .grade(lessonProgress.getGrade())
                        .lastActivity(lessonProgress.getLastActivity() != null
                                ? lessonProgress.getLastActivity().toString() : null)
                        .completedSections(lessonProgress.getCompletedSections() != null
                                ? new ArrayList<>(lessonProgress.getCompletedSections()) : null)
                        .build();
                progressMap.put(lessonId, data);
            });
        }

        EnrollmentJpaEntity entity = EnrollmentJpaEntity.builder()
                .id(domain.getId())
                .learningClass(learningClassEntity)
                .studentId(domain.getStudentId())
                .status(status)
                .progress(progressMap)
                .completionPercent(domain.getCompletionPercent() != null ? domain.getCompletionPercent() : 0)
                .completedAt(domain.getCompletedAt())
                .enrolledAt(domain.getEnrolledAt())
                .joinedAt(domain.getJoinedAt())
                .lastAccessedAt(domain.getLastAccessedAt())
                .build();
        // Carry version for optimistic locking (prevents @Version reset to 0)
        if (domain.getVersion() != null) {
            entity.setVersion(domain.getVersion());
        }
        return entity;
    }

    /**
     * Convert JPA entity to domain model.
     */
    public Enrollment toDomain(EnrollmentJpaEntity entity) {
        if (entity == null) return null;

        // Convert JPA entity status to domain status
        Enrollment.EnrollmentStatus status = Enrollment.EnrollmentStatus.ACTIVE;
        if (entity.getStatus() != null) {
            try {
                status = Enrollment.EnrollmentStatus.valueOf(entity.getStatus().name());
            } catch (IllegalArgumentException ignored) {
                // Unknown status enum — default to ACTIVE
            }
        }

        // Convert progress map (JPA String -> domain Instant)
        Map<String, Enrollment.LessonProgress> progressMap = new HashMap<>();
        if (entity.getProgress() != null) {
            entity.getProgress().forEach((lessonId, data) -> {
                Instant lastActivity = null;
                if (data.getLastActivity() != null) {
                    try {
                        lastActivity = Instant.parse(data.getLastActivity());
                    } catch (java.time.format.DateTimeParseException ignored) {
                        // Invalid Instant format — default to null
                    }
                }
                Enrollment.LessonProgress progress = Enrollment.LessonProgress.builder()
                        .status(data.getStatus())
                        .watchSeconds(data.getWatchSeconds())
                        .grade(data.getGrade())
                        .lastActivity(lastActivity)
                        .completedSections(data.getCompletedSections() != null
                                ? new ArrayList<>(data.getCompletedSections()) : null)
                        .build();
                progressMap.put(lessonId, progress);
            });
        }

        // Convert LearningClass if present
        LearningClass learningClass = null;
        if (entity.getLearningClass() != null) {
            learningClass = learningClassMapper.toDomain(entity.getLearningClass());
        }

        return Enrollment.builder()
                .id(entity.getId())
                .learningClass(learningClass)
                .studentId(entity.getStudentId())
                .status(status)
                .progress(progressMap)
                .completionPercent(entity.getCompletionPercent())
                .completedAt(entity.getCompletedAt())
                .enrolledAt(entity.getEnrolledAt())
                .joinedAt(entity.getJoinedAt())
                .lastAccessedAt(entity.getLastAccessedAt())
                .version(entity.getVersion())
                .build();
    }
}
