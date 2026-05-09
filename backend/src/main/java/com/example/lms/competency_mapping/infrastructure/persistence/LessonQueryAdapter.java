package com.example.lms.competency_mapping.infrastructure.persistence;

import com.example.lms.competency_mapping.application.port.LessonQueryPort;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class LessonQueryAdapter implements LessonQueryPort {

    @PersistenceContext
    private EntityManager em;

    @Override
    public LessonInfo findById(UUID lessonId) {
        var results = em.createNativeQuery("""
                SELECT l.id, l.title, ch.title AS chapter_title, ch.id AS chapter_id, ch.course_id
                FROM lessons l
                JOIN chapters ch ON l.chapter_id = ch.id
                WHERE l.id = :lessonId
                """)
                .setParameter("lessonId", lessonId)
                .getResultList();

        if (results.isEmpty()) return null;
        Object[] row = (Object[]) results.get(0);
        return new LessonInfo(
                toUUID(row[0]),
                (String) row[1],
                (String) row[2],
                toUUID(row[3]),
                toUUID(row[4])
        );
    }

    @Override
    public List<LessonInfo> findAllByCourseId(UUID courseId) {
        var results = em.createNativeQuery("""
                SELECT l.id, l.title, ch.title AS chapter_title, ch.id AS chapter_id, ch.course_id
                FROM lessons l
                JOIN chapters ch ON l.chapter_id = ch.id
                WHERE ch.course_id = :courseId
                ORDER BY ch.order_index ASC, l.order_index ASC
                """)
                .setParameter("courseId", courseId)
                .getResultList();

        return results.stream()
                .map(r -> {
                    Object[] row = (Object[]) r;
                    return new LessonInfo(
                            toUUID(row[0]),
                            (String) row[1],
                            (String) row[2],
                            toUUID(row[3]),
                            toUUID(row[4])
                    );
                })
                .toList();
    }

    @Override
    public boolean canTeachCourse(UUID courseId, UUID teacherId) {
        var count = ((Number) em.createNativeQuery("""
                SELECT COUNT(*)
                FROM courses c
                WHERE c.id = :courseId
                  AND (
                    c.teacher_id = :teacherId
                    OR EXISTS (
                      SELECT 1
                      FROM class_teachers ct
                      JOIN learning_classes lc ON lc.id = ct.class_id
                      WHERE ct.teacher_id = :teacherId
                        AND lc.course_id = :courseId
                    )
                  )
                """)
                .setParameter("courseId", courseId)
                .setParameter("teacherId", teacherId)
                .getSingleResult()).longValue();
        return count > 0;
    }

    @Override
    public boolean canTeachLesson(UUID lessonId, UUID teacherId) {
        var count = ((Number) em.createNativeQuery("""
                SELECT COUNT(*)
                FROM lessons l
                JOIN chapters ch ON l.chapter_id = ch.id
                JOIN courses c ON ch.course_id = c.id
                WHERE l.id = :lessonId
                  AND (
                    c.teacher_id = :teacherId
                    OR EXISTS (
                      SELECT 1
                      FROM class_teachers ct
                      JOIN learning_classes lc ON lc.id = ct.class_id
                      WHERE ct.teacher_id = :teacherId
                        AND lc.course_id = c.id
                    )
                  )
                """)
                .setParameter("lessonId", lessonId)
                .setParameter("teacherId", teacherId)
                .getSingleResult()).longValue();
        return count > 0;
    }

    @Override
    public boolean isStudentEnrolledInCourse(UUID courseId, UUID studentId) {
        var count = ((Number) em.createNativeQuery("""
                SELECT COUNT(*)
                FROM enrollments e
                JOIN learning_classes lc ON e.class_id = lc.id
                WHERE e.student_id = :studentId
                  AND lc.course_id = :courseId
                  AND e.status IN ('ACTIVE', 'COMPLETED')
                """)
                .setParameter("courseId", courseId)
                .setParameter("studentId", studentId)
                .getSingleResult()).longValue();
        return count > 0;
    }

    @Override
    public boolean isStudentEnrolledInLesson(UUID lessonId, UUID studentId) {
        var count = ((Number) em.createNativeQuery("""
                SELECT COUNT(*)
                FROM lessons l
                JOIN chapters ch ON l.chapter_id = ch.id
                JOIN learning_classes lc ON lc.course_id = ch.course_id
                JOIN enrollments e ON e.class_id = lc.id
                WHERE l.id = :lessonId
                  AND e.student_id = :studentId
                  AND e.status IN ('ACTIVE', 'COMPLETED')
                """)
                .setParameter("lessonId", lessonId)
                .setParameter("studentId", studentId)
                .getSingleResult()).longValue();
        return count > 0;
    }

    private UUID toUUID(Object value) {
        if (value == null) return null;
        if (value instanceof UUID u) return u;
        return UUID.fromString(value.toString());
    }
}
