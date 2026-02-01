package com.example.lms.course_authoring.infrastructure.persistence;

import com.example.lms.course_authoring.domain.model.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for Lesson entity.
 * 
 * SOTA Best Practices:
 * - Direct queries instead of nested loops
 * - JOIN FETCH for eager loading related entities
 * - Indexed lookups by UUID for O(1) performance
 */
@Repository
public interface JpaLessonRepository extends JpaRepository<Lesson, UUID> {

    /**
     * Find lesson by ID with chapter and course eagerly loaded.
     * Single query with JOIN FETCH - optimal for lesson detail view.
     */
    @Query("SELECT l FROM Lesson l " +
           "JOIN FETCH l.chapter ch " +
           "JOIN FETCH ch.course c " +
           "WHERE l.id = :lessonId")
    Optional<Lesson> findByIdWithContext(@Param("lessonId") UUID lessonId);

    /**
     * Find all lessons belonging to a specific chapter.
     */
    @Query("SELECT l FROM Lesson l WHERE l.chapter.id = :chapterId ORDER BY l.orderIndex")
    java.util.List<Lesson> findByChapterId(@Param("chapterId") UUID chapterId);

    /**
     * Count lessons in a chapter.
     */
    @Query("SELECT COUNT(l) FROM Lesson l WHERE l.chapter.id = :chapterId")
    long countByChapterId(@Param("chapterId") UUID chapterId);
}
