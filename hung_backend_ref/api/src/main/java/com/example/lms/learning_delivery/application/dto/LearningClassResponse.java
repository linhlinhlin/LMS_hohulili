package com.example.lms.learning_delivery.application.dto;

import com.example.lms.learning_delivery.domain.model.LearningClass;
import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for learning class data.
 */
public record LearningClassResponse(
    UUID id,
    String name,
    String code,
    UUID courseId,
    UUID teacherId,
    String status,
    String scheduleType,
    String semester,
    Integer maxStudents,
    Instant startDate,
    Instant endDate,
    Instant createdAt
) {
    public static LearningClassResponse from(LearningClass learningClass) {
        return new LearningClassResponse(
            learningClass.getId(),
            learningClass.getName(),
            learningClass.getCode(),
            learningClass.getCourseId(),
            learningClass.getTeacherId(),
            learningClass.getStatus() != null ? learningClass.getStatus().name() : null,
            learningClass.getScheduleType() != null ? learningClass.getScheduleType().name() : null,
            learningClass.getSemester(),
            learningClass.getMaxStudents(),
            learningClass.getStartDate(),
            learningClass.getEndDate(),
            learningClass.getCreatedAt()
        );
    }
}
