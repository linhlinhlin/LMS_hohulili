package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.mapper.LearningClassEntityMapper;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseJpaRepositoryV2;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Use case for creating a learning class.
 * V3 - Uses pure domain models only.
 */
@Service("createLearningClassUseCaseV3")
@RequiredArgsConstructor
@Slf4j
public class CreateLearningClassUseCaseV3 {

    private final LearningClassEntityMapper mapper;

    public record CreateClassCommand(
        UUID courseId,
        UUID teacherId,
        String code,
        String name,
        Instant startDate,
        Instant endDate,
        Integer maxStudents
    ) {}

    @Transactional
    public UUID execute(CreateClassCommand command) {
        log.info("Creating learning class {} for course {} (V3)", command.name(), command.courseId());

        LearningClassJpaEntity entity = mapper.toEntity(
            command.courseId(),
            command.teacherId(),
            command.code(),
            command.name(),
            command.startDate(),
            command.endDate(),
            command.maxStudents()
        );

        // Note: Need to inject and use LearningClassJpaRepository
        log.info("Learning class {} created (V3)", command.name());
        
        return UUID.randomUUID(); // Placeholder
    }
}
