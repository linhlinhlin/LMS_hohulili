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
                SELECT l.id, l.title, ch.title AS chapter_title, ch.course_id
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
                toUUID(row[3])
        );
    }

    @Override
    public List<LessonInfo> findAllByCourseId(UUID courseId) {
        var results = em.createNativeQuery("""
                SELECT l.id, l.title, ch.title AS chapter_title, ch.course_id
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
                            toUUID(row[3])
                    );
                })
                .toList();
    }

    @Override
    public boolean isLessonOwnedBy(UUID lessonId, UUID userId) {
        var count = ((Number) em.createNativeQuery("""
                SELECT COUNT(*) FROM lessons l
                JOIN chapters ch ON l.chapter_id = ch.id
                JOIN courses c ON ch.course_id = c.id
                WHERE l.id = :lessonId AND c.teacher_id = :userId
                """)
                .setParameter("lessonId", lessonId)
                .setParameter("userId", userId)
                .getSingleResult()).longValue();
        return count > 0;
    }

    private UUID toUUID(Object value) {
        if (value == null) return null;
        if (value instanceof UUID u) return u;
        return UUID.fromString(value.toString());
    }
}
