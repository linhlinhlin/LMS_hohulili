package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.GradingAuditLogJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GradingAuditLogJpaRepository extends JpaRepository<GradingAuditLogJpaEntity, Long> {

    List<GradingAuditLogJpaEntity> findByAssignmentIdOrderByOccurredAtDesc(UUID assignmentId);

    List<GradingAuditLogJpaEntity> findBySubmissionIdOrderByOccurredAtDesc(UUID submissionId);
}
