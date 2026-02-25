package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.QuizAttemptJpaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QuizAttemptJpaRepository extends JpaRepository<QuizAttemptJpaEntity, UUID> {
    List<QuizAttemptJpaEntity> findByQuizIdAndStudentId(UUID quizId, UUID studentId);

    @Query("SELECT qa FROM QuizAttemptJpaEntity qa WHERE qa.quizId = :quizId ORDER BY qa.createdAt DESC")
    List<QuizAttemptJpaEntity> findByQuizIdOrderByCreatedAtDesc(@Param("quizId") UUID quizId);

    @Query("SELECT qa FROM QuizAttemptJpaEntity qa WHERE qa.quizId IN :quizIds ORDER BY qa.createdAt DESC")
    List<QuizAttemptJpaEntity> findByQuizIdInOrderByCreatedAtDesc(@Param("quizIds") List<UUID> quizIds);

    @Query("SELECT qa FROM QuizAttemptJpaEntity qa WHERE qa.studentId = :studentId ORDER BY qa.createdAt DESC")
    List<QuizAttemptJpaEntity> findByStudentIdOrderByCreatedAtDesc(@Param("studentId") UUID studentId);

    // === Paginated queries (Canvas SOTA: page + per_page) ===

    @Query("SELECT qa FROM QuizAttemptJpaEntity qa WHERE qa.quizId = :quizId ORDER BY qa.createdAt DESC")
    Page<QuizAttemptJpaEntity> findByQuizIdOrderByCreatedAtDesc(@Param("quizId") UUID quizId, Pageable pageable);

    @Query("SELECT qa FROM QuizAttemptJpaEntity qa WHERE qa.studentId = :studentId ORDER BY qa.createdAt DESC")
    Page<QuizAttemptJpaEntity> findByStudentIdOrderByCreatedAtDesc(@Param("studentId") UUID studentId, Pageable pageable);

    @Query("SELECT qa FROM QuizAttemptJpaEntity qa WHERE qa.quizId IN :quizIds ORDER BY qa.createdAt DESC")
    Page<QuizAttemptJpaEntity> findByQuizIdInOrderByCreatedAtDesc(@Param("quizIds") List<UUID> quizIds, Pageable pageable);

    // === Analytics queries ===

    @Query("SELECT AVG(qa.score / qa.maxScore * 100) FROM QuizAttemptJpaEntity qa WHERE qa.studentId = :studentId AND qa.status = 'GRADED' AND qa.maxScore > 0")
    Double getAverageScorePercentByStudentId(@Param("studentId") UUID studentId);

    @Query("SELECT qa FROM QuizAttemptJpaEntity qa WHERE qa.studentId = :studentId AND qa.status = 'GRADED' ORDER BY qa.submittedAt DESC")
    List<QuizAttemptJpaEntity> findGradedByStudentIdOrderBySubmittedAtDesc(@Param("studentId") UUID studentId);

    long countByStudentIdAndStatus(UUID studentId, QuizAttemptJpaEntity.AttemptStatus status);

    @Query("SELECT COUNT(qa) FROM QuizAttemptJpaEntity qa WHERE qa.studentId = :studentId AND qa.status = 'GRADED' AND qa.maxScore > 0 AND qa.score >= qa.maxScore")
    long countPerfectScoresByStudentId(@Param("studentId") UUID studentId);

    @Query("SELECT qa FROM QuizAttemptJpaEntity qa WHERE qa.quizId IN :quizIds AND qa.studentId = :studentId")
    List<QuizAttemptJpaEntity> findByQuizIdInAndStudentId(@Param("quizIds") List<UUID> quizIds, @Param("studentId") UUID studentId);
}
