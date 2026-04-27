package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentAttachmentJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssignmentAttachmentJpaRepository extends JpaRepository<AssignmentAttachmentJpaEntity, UUID> {
    void deleteByAssignmentId(UUID assignmentId);

    List<AssignmentAttachmentJpaEntity> findBySubmissionId(UUID submissionId);

    void deleteBySubmissionId(UUID submissionId);

    // ── Instruction attachments (submission_id IS NULL) ─────────────────────
    // Pattern Google Classroom: teacher upload PDF/Word/sample dính kèm
    // assignment, hiển thị riêng với rich-text instructions.

    List<AssignmentAttachmentJpaEntity>
        findByAssignmentIdAndSubmissionIdIsNullOrderByDisplayOrderAscUploadedAtAsc(UUID assignmentId);

    @Query("SELECT a FROM AssignmentAttachmentJpaEntity a "
            + "WHERE a.assignmentId IN :ids AND a.submissionId IS NULL "
            + "ORDER BY a.assignmentId, a.displayOrder ASC")
    List<AssignmentAttachmentJpaEntity> findInstructionAttachmentsByAssignmentIds(
            @Param("ids") Collection<UUID> ids);

    Optional<AssignmentAttachmentJpaEntity> findByIdAndSubmissionIdIsNull(UUID id);
}
