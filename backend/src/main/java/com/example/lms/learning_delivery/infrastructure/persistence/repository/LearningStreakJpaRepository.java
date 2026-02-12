package com.example.lms.learning_delivery.infrastructure.persistence.repository;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningStreakJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LearningStreakJpaRepository extends JpaRepository<LearningStreakJpaEntity, UUID> {

    Optional<LearningStreakJpaEntity> findByStudentId(UUID studentId);
}
