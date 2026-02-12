package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentSubmissionJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface AssignmentSubmissionJpaRepository extends JpaRepository<AssignmentSubmissionJpaEntity, UUID> {
    void deleteByAssignmentId(UUID assignmentId);

    java.util.List<AssignmentSubmissionJpaEntity> findByAssignmentId(UUID assignmentId);

    java.util.Optional<AssignmentSubmissionJpaEntity> findByAssignmentIdAndStudentId(UUID assignmentId, UUID studentId);

    java.util.List<AssignmentSubmissionJpaEntity> findByStudentId(UUID studentId);

    java.util.List<AssignmentSubmissionJpaEntity> findByStatus(AssignmentSubmissionJpaEntity.SubmissionStatus status);

    java.util.List<AssignmentSubmissionJpaEntity> findByAssignmentIdIn(java.util.List<UUID> assignmentIds);

    // === Analytics queries ===

    @org.springframework.data.jpa.repository.Query("SELECT AVG(a.grade / a.maxGrade * 100) FROM AssignmentSubmissionJpaEntity a WHERE a.studentId = :studentId AND a.status = 'GRADED' AND a.maxGrade > 0")
    Double getAverageGradePercentByStudentId(@org.springframework.data.repository.query.Param("studentId") UUID studentId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(a) FROM AssignmentSubmissionJpaEntity a WHERE a.assignmentId IN :assignmentIds AND a.status = 'SUBMITTED'")
    long countPendingByAssignmentIds(@org.springframework.data.repository.query.Param("assignmentIds") java.util.List<UUID> assignmentIds);

    long countByStudentIdAndStatus(UUID studentId, AssignmentSubmissionJpaEntity.SubmissionStatus status);
}
