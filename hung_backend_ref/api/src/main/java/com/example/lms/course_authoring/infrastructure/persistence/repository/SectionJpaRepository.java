package com.example.lms.course_authoring.infrastructure.persistence.repository;

import com.example.lms.course_authoring.infrastructure.persistence.entity.SectionJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA Repository for Section.
 */
@Repository
public interface SectionJpaRepository extends JpaRepository<SectionJpaEntity, UUID> {

    List<SectionJpaEntity> findByLessonIdOrderByOrderIndex(UUID lessonId);

    long countByLessonId(UUID lessonId);
}
