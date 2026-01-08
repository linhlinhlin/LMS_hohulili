package com.example.lms.course_authoring.application.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.util.UUID;

/**
 * Service for cleaning up related records before lesson deletion.
 * This handles FK constraints from tables in other bounded contexts.
 */
@Service
public class LessonCleanupService {

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Delete all related records that reference the lesson.
     * Must be called BEFORE the lesson is deleted to avoid FK violations.
     */
    @Transactional
    public void cleanupBeforeDelete(UUID lessonId) {
        // Delete quiz-related data first (respecting FK hierarchy)
        // 1. Delete quiz_attempt_items (FK to quiz_attempts)
        entityManager.createNativeQuery(
            "DELETE FROM quiz_attempt_items WHERE attempt_id IN " +
            "(SELECT id FROM quiz_attempts WHERE quiz_id IN " +
            "(SELECT id FROM quizzes WHERE lesson_id = :lessonId))")
            .setParameter("lessonId", lessonId)
            .executeUpdate();
            
        // 2. Delete quiz_attempts (FK to quizzes)
        entityManager.createNativeQuery(
            "DELETE FROM quiz_attempts WHERE quiz_id IN " +
            "(SELECT id FROM quizzes WHERE lesson_id = :lessonId)")
            .setParameter("lessonId", lessonId)
            .executeUpdate();
            
        // 3. Delete quiz_questions (FK to quizzes)
        entityManager.createNativeQuery(
            "DELETE FROM quiz_questions WHERE quiz_id IN " +
            "(SELECT id FROM quizzes WHERE lesson_id = :lessonId)")
            .setParameter("lessonId", lessonId)
            .executeUpdate();
            
        // 4. Delete quiz_assignments (FK to quizzes)
        entityManager.createNativeQuery(
            "DELETE FROM quiz_assignments WHERE quiz_id IN " +
            "(SELECT id FROM quizzes WHERE lesson_id = :lessonId)")
            .setParameter("lessonId", lessonId)
            .executeUpdate();

        // 5. Delete quizzes
        entityManager.createNativeQuery(
            "DELETE FROM quizzes WHERE lesson_id = :lessonId")
            .setParameter("lessonId", lessonId)
            .executeUpdate();

        // Delete lesson_assignments
        entityManager.createNativeQuery(
            "DELETE FROM lesson_assignments WHERE lesson_id = :lessonId")
            .setParameter("lessonId", lessonId)
            .executeUpdate();

        // Delete lesson_attachments
        entityManager.createNativeQuery(
            "DELETE FROM lesson_attachments WHERE lesson_id = :lessonId")
            .setParameter("lessonId", lessonId)
            .executeUpdate();

        // Delete stu_lesson_progress
        entityManager.createNativeQuery(
            "DELETE FROM stu_lesson_progress WHERE lesson_id = :lessonId")
            .setParameter("lessonId", lessonId)
            .executeUpdate();

        // Flush to ensure all deletes are executed
        entityManager.flush();
    }
}
