package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentSubmissionJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface AssignmentSubmissionJpaRepository extends JpaRepository<AssignmentSubmissionJpaEntity, UUID> {
    void deleteByAssignmentId(UUID assignmentId);
}
