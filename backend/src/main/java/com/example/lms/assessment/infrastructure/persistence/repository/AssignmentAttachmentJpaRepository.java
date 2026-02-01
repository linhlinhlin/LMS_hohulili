package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentAttachmentJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface AssignmentAttachmentJpaRepository extends JpaRepository<AssignmentAttachmentJpaEntity, UUID> {
    void deleteByAssignmentId(UUID assignmentId);
}
