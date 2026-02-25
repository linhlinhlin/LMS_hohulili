package com.example.lms.course_authoring.infrastructure.persistence.repository;

import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA Repository for Lesson.
 */
@Repository
public interface LessonJpaRepository extends JpaRepository<LessonJpaEntity, UUID> {

    List<LessonJpaEntity> findByChapterIdOrderByOrderIndex(UUID chapterId);

    long countByChapterId(UUID chapterId);

    List<LessonJpaEntity> findByChapterIdIn(List<UUID> chapterIds);
}
