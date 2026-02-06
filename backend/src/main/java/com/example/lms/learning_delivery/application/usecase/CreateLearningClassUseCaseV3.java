package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.shared.exception.BusinessRuleException;
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

    private final LearningClassRepository classRepository;

    public record CreateClassCommand(
        UUID courseId,
        UUID teacherId,
        String code,
        String name,
        Instant startDate,
        Instant endDate,
        Integer maxStudents,
        String scheduleType,
        String semester
    ) {}

    @Transactional
    public UUID execute(CreateClassCommand command) {
        log.info("Creating learning class {} for course {} (V3)", command.name(), command.courseId());

        // Validate code uniqueness if provided
        if (command.code() != null && classRepository.existsByCode(command.code())) {
            throw new BusinessRuleException("CLASS_CODE_EXISTS",
                "Mã lớp học đã tồn tại: " + command.code());
        }

        // Determine schedule type
        LearningClass.ScheduleType scheduleType = LearningClass.ScheduleType.CUSTOM;
        if (command.scheduleType() != null) {
            try {
                scheduleType = LearningClass.ScheduleType.valueOf(command.scheduleType());
            } catch (IllegalArgumentException e) {
                // Default to CUSTOM
            }
        }

        // Create domain model
        LearningClass learningClass = LearningClass.builder()
                .id(UUID.randomUUID())
                .courseId(command.courseId())
                .teacherId(command.teacherId())
                .code(command.code())
                .name(command.name())
                .status(LearningClass.ClassStatus.OPEN)
                .maxStudents(command.maxStudents() != null ? command.maxStudents() : 50)
                .startDate(command.startDate())
                .endDate(command.endDate())
                .scheduleType(scheduleType)
                .semester(command.semester())
                .createdAt(Instant.now())
                .build();

        LearningClass saved = classRepository.save(learningClass);

        log.info("Learning class {} created successfully with ID {}", command.name(), saved.getId());

        return saved.getId();
    }
}
