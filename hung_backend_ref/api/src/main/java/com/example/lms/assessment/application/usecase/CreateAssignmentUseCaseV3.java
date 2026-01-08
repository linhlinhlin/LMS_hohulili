package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Assignment;
import com.example.lms.assessment.domain.repository.AssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
public class CreateAssignmentUseCaseV3 {

    private static final Logger log = LoggerFactory.getLogger(CreateAssignmentUseCaseV3.class);

    private final AssignmentRepository assignmentRepository;
    private final com.example.lms.assessment.infrastructure.persistence.repository.AssignmentAllocationJpaRepository assignmentAllocationRepository;
    private final com.example.lms.assessment.infrastructure.persistence.repository.AssignmentAllocationStudentJpaRepository assignmentAllocationStudentRepository;



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

        // Handle Allocation (Schema Compliance)
        if (command.distributionType() != null) {
            var allocation = com.example.lms.assessment.infrastructure.persistence.entity.AssignmentAllocationJpaEntity.builder()
                .assignmentId(saved.getId().value())
                .distributionType(command.distributionType())
                .isActive(true)
                .build();
            
            var savedAllocation = assignmentAllocationRepository.save(allocation);
            
            if ("SPECIFIC_STUDENTS".equals(command.distributionType()) && command.studentIds() != null && !command.studentIds().isEmpty()) {
                command.studentIds().forEach(studentId -> {
                    var entity = com.example.lms.assessment.infrastructure.persistence.entity.AssignmentAllocationStudentJpaEntity.builder()
                        .allocationId(savedAllocation.getId())
                        .studentId(studentId)
                        .assignedAt(Instant.now())
                        .build();
                    assignmentAllocationStudentRepository.save(entity);
                });
            }
        }

        return saved.getId().value();
    }
}

