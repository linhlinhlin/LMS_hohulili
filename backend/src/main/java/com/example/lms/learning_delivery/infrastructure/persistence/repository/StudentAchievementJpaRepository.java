package com.example.lms.learning_delivery.infrastructure.persistence.repository;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.StudentAchievementJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StudentAchievementJpaRepository extends JpaRepository<StudentAchievementJpaEntity, UUID> {

    List<StudentAchievementJpaEntity> findByStudentId(UUID studentId);

    boolean existsByStudentIdAndAchievementId(UUID studentId, UUID achievementId);

    long countByStudentId(UUID studentId);
}
