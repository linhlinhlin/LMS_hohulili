package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.application.dto.LearningClassResponse;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Use case for updating a learning class.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UpdateLearningClassUseCase {

    private final LearningClassRepository classRepository;

    public record UpdateClassCommand(
        UUID classId,
        String name,
        String code,
        String status,
        Integer maxStudents,
        Instant startDate,
        Instant endDate
    ) {}

    @Transactional
    public LearningClassResponse execute(UpdateClassCommand command) {
        log.info("Updating learning class {}", command.classId());

        LearningClass learningClass = classRepository.findById(command.classId())
                .orElseThrow(() -> new EntityNotFoundException("Lớp học", command.classId()));

        // Update via domain behavior method
        LearningClass.ClassStatus newStatus = command.status() != null
                ? LearningClass.ClassStatus.valueOf(command.status()) : null;
        learningClass.update(
                command.name(), command.code(), newStatus,
                command.maxStudents(), command.startDate(), command.endDate()
        );

        LearningClass updated = classRepository.save(learningClass);

        log.info("Learning class {} updated successfully", command.classId());

        return LearningClassResponse.from(updated);
    }
}
