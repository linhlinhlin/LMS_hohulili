package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA Repository for Assignment.
 */
@Repository
public interface AssignmentJpaRepository extends JpaRepository<AssignmentJpaEntity, UUID> {

    List<AssignmentJpaEntity> findByLessonId(UUID lessonId);

    List<AssignmentJpaEntity> findByCourseId(UUID courseId);

    List<AssignmentJpaEntity> findByStatus(AssignmentJpaEntity.AssignmentStatus status);

    List<AssignmentJpaEntity> findByCourseIdIn(List<UUID> courseIds);
}
