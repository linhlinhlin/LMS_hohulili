package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.QuizJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA Repository for Quiz (V3).
 */
@Repository("quizJpaRepositoryV3")
public interface QuizJpaRepositoryV3 extends JpaRepository<QuizJpaEntity, UUID> {

    List<QuizJpaEntity> findByLessonId(UUID lessonId);

    List<QuizJpaEntity> findByStatus(QuizJpaEntity.QuizStatus status);
}
