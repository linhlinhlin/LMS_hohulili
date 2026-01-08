package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.QuizAttemptJpaEntity;
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
}
