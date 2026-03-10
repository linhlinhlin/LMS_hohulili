package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.QuizAssignmentJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface QuizAssignmentJpaRepository extends JpaRepository<QuizAssignmentJpaEntity, UUID> {
    Optional<QuizAssignmentJpaEntity> findFirstByQuizIdOrderByAssignedAtDesc(UUID quizId);
}
