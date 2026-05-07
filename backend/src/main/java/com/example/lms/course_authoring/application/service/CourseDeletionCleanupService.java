package com.example.lms.course_authoring.application.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Cleans course-related rows that are not fully covered by database cascades.
 */
@Service
public class CourseDeletionCleanupService {

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public void cleanupBeforeDelete(UUID courseId) {
        Set<String> tables = loadExistingTables();

        deleteByCourseIfPresent(tables, "certificates",
                "DELETE FROM certificates WHERE course_id = :courseId", courseId);
        deleteByCourseIfPresent(tables, "student_notes",
                "DELETE FROM student_notes WHERE course_id = :courseId", courseId);
        deleteByCourseIfPresent(tables, "ai_alerts",
                "DELETE FROM ai_alerts WHERE course_id = :courseId", courseId);
        deleteByCourseIfPresent(tables, "quiz_assignments",
                "DELETE FROM quiz_assignments WHERE course_id = :courseId", courseId);

        deleteByLessonIfPresent(tables, "learning_events",
                "DELETE FROM learning_events WHERE lesson_id IN (" + courseLessonSubquery() + ")", courseId);
        deleteByLessonIfPresent(tables, "video_progress",
                "DELETE FROM video_progress WHERE lesson_id IN (" + courseLessonSubquery() + ")", courseId);
        deleteByLessonIfPresent(tables, "student_lesson_progress",
                "DELETE FROM student_lesson_progress WHERE lesson_id IN (" + courseLessonSubquery() + ")", courseId);

        deleteAssignmentsForCourse(tables, courseId);

        // payment_transactions cascade from courses; revenue_splits references
        // those payment rows and must be removed first for hard course deletion.
        deleteByCourseIfPresent(tables, "revenue_splits",
                "DELETE FROM revenue_splits WHERE course_id = :courseId", courseId);

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

    private void deleteAssignmentsForCourse(Set<String> tables, UUID courseId) {
        if (!tables.contains("assignments")) {
            return;
        }
        executeDelete(
                "DELETE FROM assignments WHERE course_id = :courseId OR lesson_id IN (" + courseLessonSubquery() + ")",
                courseId
        );
    }

    private void deleteByCourseIfPresent(Set<String> tables, String tableName, String sql, UUID courseId) {
        if (!tables.contains(tableName)) {
            return;
        }
        executeDelete(sql, courseId);
    }

    private void deleteByLessonIfPresent(Set<String> tables, String tableName, String sql, UUID courseId) {
        if (!tables.contains(tableName)) {
            return;
        }
        executeDelete(sql, courseId);
    }

    private void executeDelete(String sql, UUID courseId) {
        entityManager.createNativeQuery(sql)
                .setParameter("courseId", courseId)
                .executeUpdate();
    }

    private String courseLessonSubquery() {
        return """
                SELECT l.id
                FROM lessons l
                JOIN chapters ch ON ch.id = l.chapter_id
                WHERE ch.course_id = :courseId
                """;
    }
}
