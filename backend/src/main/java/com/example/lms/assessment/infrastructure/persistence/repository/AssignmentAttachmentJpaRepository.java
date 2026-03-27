package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentAttachmentJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface AssignmentAttachmentJpaRepository extends JpaRepository<AssignmentAttachmentJpaEntity, UUID> {
    void deleteByAssignmentId(UUID assignmentId);

    List<AssignmentAttachmentJpaEntity> findBySubmissionId(UUID submissionId);

    void deleteBySubmissionId(UUID submissionId);
}
