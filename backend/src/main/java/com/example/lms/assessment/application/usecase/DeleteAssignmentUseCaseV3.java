package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.AssignmentId;
import com.example.lms.assessment.domain.repository.AssignmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for deleting an assignment with all related entities.
 * Follows Clean Architecture - depends only on domain interfaces.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DeleteAssignmentUseCaseV3 {

    private final AssignmentRepository assignmentRepository;

    @Transactional
    public void execute(UUID assignmentId) {
        log.info("Executing delete assignment use case for ID: {}", assignmentId);
        assignmentRepository.deleteByIdWithCascade(AssignmentId.of(assignmentId));
    }
}
