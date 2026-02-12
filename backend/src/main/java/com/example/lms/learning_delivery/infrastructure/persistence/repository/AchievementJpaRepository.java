package com.example.lms.learning_delivery.infrastructure.persistence.repository;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.AchievementJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AchievementJpaRepository extends JpaRepository<AchievementJpaEntity, UUID> {

    Optional<AchievementJpaEntity> findByCode(String code);

    List<AchievementJpaEntity> findByCategory(String category);
}
