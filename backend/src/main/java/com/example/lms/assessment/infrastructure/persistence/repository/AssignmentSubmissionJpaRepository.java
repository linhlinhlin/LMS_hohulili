package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentSubmissionJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
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

    // === Teacher assignment stats queries (batch) ===

    @Query("SELECT s.assignmentId, COUNT(s) FROM AssignmentSubmissionJpaEntity s WHERE s.assignmentId IN :ids GROUP BY s.assignmentId")
    List<Object[]> countSubmissionsByAssignmentIds(@Param("ids") List<UUID> ids);

    @Query("SELECT s.assignmentId, COUNT(s) FROM AssignmentSubmissionJpaEntity s WHERE s.assignmentId IN :ids AND s.status = 'GRADED' GROUP BY s.assignmentId")
    List<Object[]> countGradedByAssignmentIds(@Param("ids") List<UUID> ids);

    @Query("SELECT s.assignmentId, AVG(s.grade) FROM AssignmentSubmissionJpaEntity s WHERE s.assignmentId IN :ids AND s.grade IS NOT NULL GROUP BY s.assignmentId")
    List<Object[]> avgGradeByAssignmentIds(@Param("ids") List<UUID> ids);
}
