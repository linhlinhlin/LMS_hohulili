package com.example.lms.course_authoring.infrastructure.persistence.repository;

import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA Repository for Lesson.
 */
@Repository
public interface LessonJpaRepository extends JpaRepository<LessonJpaEntity, UUID> {

    List<LessonJpaEntity> findByChapterIdOrderByOrderIndex(UUID chapterId);

    long countByChapterId(UUID chapterId);

    List<LessonJpaEntity> findByChapterIdIn(List<UUID> chapterIds);

    @Query(value = """
            SELECT l.*
            FROM lessons l
            JOIN chapters ch ON ch.id = l.chapter_id
            WHERE ch.course_id = :courseId
            ORDER BY ch.order_index ASC, l.order_index ASC
            """, nativeQuery = true)
    List<LessonJpaEntity> findByCourseIdOrderByChapterAndLesson(@Param("courseId") UUID courseId);

    @Query(value = """
            SELECT *
            FROM lessons l
            WHERE EXISTS (
                SELECT 1
                FROM jsonb_array_elements(COALESCE(l.content_blocks, '[]'::jsonb)) AS block
                WHERE block ->> 'id' = :contentBlockId
            )
            LIMIT 1
            """, nativeQuery = true)
    Optional<LessonJpaEntity> findByContentBlockId(@Param("contentBlockId") String contentBlockId);
}
