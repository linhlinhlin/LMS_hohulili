package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Assignment;
import com.example.lms.assessment.domain.repository.AssignmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Use case for creating an assignment.
 * V3 - Uses pure domain models only.
 * 
 * Clean Architecture: Application layer depends on Domain layer only.
 */
@Service("createAssignmentUseCaseV3")
@RequiredArgsConstructor
@Slf4j
public class CreateAssignmentUseCaseV3 {

    private final AssignmentRepository assignmentRepository;

    public record CreateAssignmentCommand(
        UUID lessonId,
        UUID courseId,
        String title,
        String description,
        String instructions,
        String type,
        Integer maxScore,
        Instant dueDate,
        Boolean allowLateSubmission
    ) {}

    @Transactional
    public UUID execute(CreateAssignmentCommand command) {
        log.info("Creating assignment {} (V3)", command.title());

        // Parse assignment type
        Assignment.AssignmentType type = Assignment.AssignmentType.FILE_UPLOAD;
        try {
            type = Assignment.AssignmentType.valueOf(command.type());
        } catch (Exception ignored) {}

        // Create domain model using factory method
        Assignment assignment = Assignment.create(
            command.lessonId(),
            command.title(),
            command.description(),
            command.instructions(),
            type,
            command.maxScore()
        );

        // Set due date if provided
        if (command.dueDate() != null) {
            assignment.setDueDate(command.dueDate());
        }

        // Save via repository port
        Assignment saved = assignmentRepository.save(assignment);
        
        log.info("Assignment {} created with ID {} (V3)", command.title(), saved.getId().value());
        return saved.getId().value();
    }
}

