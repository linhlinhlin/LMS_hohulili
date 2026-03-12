package com.example.lms.course_authoring.application.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
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
        Set<String> tables = loadExistingTables();

        // Tables without FK cleanup or with restrictive FK behavior
        deleteByLessonIfPresent(tables, "student_notes",
                "DELETE FROM student_notes WHERE lesson_id = :lessonId", lessonId);
        deleteByLessonIfPresent(tables, "learning_events",
                "DELETE FROM learning_events WHERE lesson_id = :lessonId", lessonId);
        deleteByLessonIfPresent(tables, "video_progress",
                "DELETE FROM video_progress WHERE lesson_id = :lessonId", lessonId);

        // Delete assessment roots and let DB cascades clean child records
        deleteByLessonIfPresent(tables, "assignments",
                "DELETE FROM assignments WHERE lesson_id = :lessonId", lessonId);
        deleteByLessonIfPresent(tables, "quizzes",
                "DELETE FROM quizzes WHERE lesson_id = :lessonId", lessonId);

        // Explicit lesson-owned cleanup kept for schema drift safety
        deleteByLessonIfPresent(tables, "lesson_assignments",
                "DELETE FROM lesson_assignments WHERE lesson_id = :lessonId", lessonId);
        deleteByLessonIfPresent(tables, "lesson_attachments",
                "DELETE FROM lesson_attachments WHERE lesson_id = :lessonId", lessonId);
        deleteByLessonIfPresent(tables, "student_lesson_progress",
                "DELETE FROM student_lesson_progress WHERE lesson_id = :lessonId", lessonId);

        // Flush to ensure all deletes are executed
        entityManager.flush();
    }

    @SuppressWarnings("unchecked")
    private Set<String> loadExistingTables() {
        List<Object> rows = entityManager.createNativeQuery(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
                .getResultList();
        Set<String> tables = new HashSet<>();
        for (Object row : rows) {
            if (row != null) {
                tables.add(row.toString());
            }
        }
        return tables;
    }

    private void deleteByLessonIfPresent(Set<String> tables, String tableName, String sql, UUID lessonId) {
        if (!tables.contains(tableName)) {
            return;
        }
        entityManager.createNativeQuery(sql)
                .setParameter("lessonId", lessonId)
                .executeUpdate();
    }
}
