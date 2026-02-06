package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Assignment;
import com.example.lms.assessment.domain.model.AssignmentId;
import com.example.lms.assessment.domain.repository.AssignmentRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Use case for updating an existing assignment.
 * V3 - Uses domain model via AssignmentRepository port.
 */
@Service
@RequiredArgsConstructor
public class UpdateAssignmentUseCaseV3 {

    private static final Logger log = LoggerFactory.getLogger(UpdateAssignmentUseCaseV3.class);

    private final AssignmentRepository assignmentRepository;

    @Transactional
    public void execute(UUID assignmentId, Command command) {
        log.info("Updating assignment {}", assignmentId);

        Assignment assignment = assignmentRepository.findById(AssignmentId.of(assignmentId))
                .orElseThrow(() -> new EntityNotFoundException("Assignment", assignmentId));

        assignment.updateInfo(command.title(), command.description(), command.instructions());

        if (command.dueDate() != null) {
            assignment.setDueDate(Instant.parse(command.dueDate()));
        }

        assignmentRepository.save(assignment);
        log.info("Assignment {} updated successfully", assignmentId);
    }

    public record Command(
            String title,
            String description,
            String instructions,
            String dueDate,
            Integer maxScore
    ) {}
}
