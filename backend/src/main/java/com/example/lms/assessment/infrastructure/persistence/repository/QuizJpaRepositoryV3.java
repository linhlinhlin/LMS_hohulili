package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.QuizJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA Repository for Quiz (V3).
 */
@Repository("quizJpaRepositoryV3")
public interface QuizJpaRepositoryV3 extends JpaRepository<QuizJpaEntity, UUID> {

    List<QuizJpaEntity> findByLessonId(UUID lessonId);

    List<QuizJpaEntity> findByLessonIdIn(List<UUID> lessonIds);

    List<QuizJpaEntity> findByStatus(QuizJpaEntity.QuizStatus status);

    @Query(value = "SELECT CAST(q.id AS varchar) FROM quizzes q " +
           "JOIN lessons l ON q.lesson_id = l.id " +
           "JOIN chapters ch ON l.chapter_id = ch.id " +
           "JOIN courses c ON ch.course_id = c.id " +
           "WHERE c.teacher_id = CAST(:teacherId AS uuid) " +
           "ORDER BY q.created_at DESC", nativeQuery = true)
    List<String> findQuizIdsByTeacherId(@Param("teacherId") UUID teacherId);

    @Query(value = "SELECT q.* FROM quizzes q " +
           "JOIN lessons l ON q.lesson_id = l.id " +
           "JOIN chapters ch ON l.chapter_id = ch.id " +
           "JOIN courses c ON ch.course_id = c.id " +
           "WHERE c.teacher_id = CAST(:teacherId AS uuid) " +
           "ORDER BY q.created_at DESC", nativeQuery = true)
    List<QuizJpaEntity> findAllByTeacherId(@Param("teacherId") UUID teacherId);

    @Query(value = "SELECT COUNT(*) > 0 FROM quizzes q " +
           "JOIN lessons l ON q.lesson_id = l.id " +
           "JOIN chapters ch ON l.chapter_id = ch.id " +
           "JOIN courses c ON ch.course_id = c.id " +
           "WHERE q.id = CAST(:quizId AS uuid) " +
           "AND c.teacher_id = CAST(:teacherId AS uuid)", nativeQuery = true)
    boolean isOwnedByTeacher(@Param("quizId") UUID quizId, @Param("teacherId") UUID teacherId);
}
