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

    /**
     * Find PUBLISHED quizzes accessible through enrolled courses.
     * Resolves via two paths: quiz_assignments (course-scoped) + quizzes→lessons→chapters (lesson-scoped).
     * Returns Object[] rows: [quiz_id, title, description, quiz_type, time_limit_minutes,
     *   max_attempts, passing_score, due_at, course_id, course_name, question_count,
     *   access_password, available_from, lock_at]
     */
    @Query(value = "SELECT DISTINCT q.id, q.title, q.description, q.quiz_type, " +
           "q.time_limit_minutes, q.max_attempts, q.passing_score, q.due_at, " +
           "COALESCE(c_lesson.id, c_assign.id) as course_id, " +
           "COALESCE(c_lesson.title, c_assign.title) as course_name, " +
           "(SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) as question_count, " +
           "q.access_password, q.available_from, q.lock_at " +
           "FROM quizzes q " +
           "LEFT JOIN lessons l ON q.lesson_id = l.id " +
           "LEFT JOIN chapters ch ON l.chapter_id = ch.id " +
           "LEFT JOIN courses c_lesson ON ch.course_id = c_lesson.id " +
           "LEFT JOIN quiz_assignments qa ON qa.quiz_id = q.id AND qa.is_active = true " +
           "LEFT JOIN courses c_assign ON qa.course_id = c_assign.id " +
           "WHERE q.status = 'PUBLISHED' " +
           "AND (ch.course_id IN :courseIds OR qa.course_id IN :courseIds)", nativeQuery = true)
    List<Object[]> findPublishedQuizSummariesByCourseIds(@Param("courseIds") List<UUID> courseIds);

    @Query(value = "SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = :quizId", nativeQuery = true)
    long countQuestionsByQuizId(@Param("quizId") UUID quizId);
}
