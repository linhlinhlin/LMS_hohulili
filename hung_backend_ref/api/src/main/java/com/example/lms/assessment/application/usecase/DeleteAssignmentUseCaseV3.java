package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentAllocationJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentAllocationStudentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeleteAssignmentUseCaseV3 {

    private final AssignmentJpaRepository assignmentRepository;
    private final AssignmentAllocationJpaRepository allocationRepository;
    private final AssignmentAllocationStudentJpaRepository allocationStudentRepository;
    private final com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository submissionRepository;
    private final com.example.lms.assessment.infrastructure.persistence.repository.AssignmentRubricJpaRepository rubricRepository;
    private final com.example.lms.assessment.infrastructure.persistence.repository.AssignmentAttachmentJpaRepository attachmentRepository;
    private final com.example.lms.assessment.infrastructure.persistence.repository.LessonAssignmentJpaRepository lessonAssignmentRepository;

    @Transactional
    public void execute(UUID assignmentId) {
        log.info("Deleting assignment with ID: {}", assignmentId);

        // 1. Delete submissions
        // Note: Submissions might have child tables like feedback or grades, cascading usually handled by DB or JPA.
        // Assuming simple deletion for now.
        submissionRepository.deleteByAssignmentId(assignmentId);

        // 2. Delete rubrics
        rubricRepository.deleteByAssignmentId(assignmentId);

        // 3. Delete attachments
        attachmentRepository.deleteByAssignmentId(assignmentId);

        // 4. Delete lesson assignments (links)
        lessonAssignmentRepository.deleteByAssignmentId(assignmentId);

        // 5. Find and delete allocations (and their student mappings)
        var allocations = allocationRepository.findByAssignmentId(assignmentId);
        for (var allocation : allocations) {
            allocationStudentRepository.deleteByAllocationId(allocation.getId());
        }
        allocationRepository.deleteAll(allocations);

        // 6. Finally, delete the assignment
        assignmentRepository.deleteById(assignmentId);
        
        log.info("Successfully deleted assignment {}", assignmentId);
    }
}
