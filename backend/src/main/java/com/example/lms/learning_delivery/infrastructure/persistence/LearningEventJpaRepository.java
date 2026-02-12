package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningEventJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LearningEventJpaRepository extends JpaRepository<LearningEventJpaEntity, UUID> {

    /**
     * Find most recent event of any type for a student (for "continue where left off").
     */
    Optional<LearningEventJpaEntity> findFirstByStudentIdOrderByCreatedAtDesc(UUID studentId);

    /**
     * Find recent events for a student (limit by date range).
     */
    List<LearningEventJpaEntity> findByStudentIdAndCreatedAtAfterOrderByCreatedAtDesc(
            UUID studentId, Instant after);

    /**
     * Sum time_spent_seconds from HEARTBEAT events for a student in a date range.
     * Uses native query because event_data is JSONB.
     */
    @Query(value = "SELECT COALESCE(SUM(CAST(event_data->>'timeSpentSeconds' AS INTEGER)), 0) " +
           "FROM learning_events WHERE student_id = :studentId AND event_type = 'HEARTBEAT' " +
           "AND created_at >= :since", nativeQuery = true)
    long sumTimeSpentSince(@Param("studentId") UUID studentId, @Param("since") Instant since);

    /**
     * Find most recent HEARTBEAT or SECTION_VIEW for "continue where left off".
     */
    @Query("SELECT e FROM LearningEventJpaEntity e WHERE e.studentId = :studentId " +
           "AND e.eventType IN ('HEARTBEAT', 'SECTION_VIEW', 'PLAY') " +
           "ORDER BY e.createdAt DESC LIMIT 1")
    Optional<LearningEventJpaEntity> findLastActivityEvent(@Param("studentId") UUID studentId);

    long countByStudentId(UUID studentId);

    /**
     * Sum ALL heartbeat time for a student (total study time).
     */
    @Query(value = "SELECT COALESCE(SUM(CAST(event_data->>'timeSpentSeconds' AS INTEGER)), 0) " +
           "FROM learning_events WHERE student_id = :studentId AND event_type = 'HEARTBEAT'",
           nativeQuery = true)
    Long sumTimeSpentByStudentId(@Param("studentId") UUID studentId);

    /**
     * Count events per day for heatmap (Phase 5).
     */
    @Query(value = "SELECT DATE(created_at) as activity_date, COUNT(*) as event_count " +
           "FROM learning_events WHERE student_id = :studentId " +
           "AND created_at >= :since GROUP BY DATE(created_at) ORDER BY activity_date",
           nativeQuery = true)
    List<Object[]> countEventsByDaySince(@Param("studentId") UUID studentId, @Param("since") Instant since);

    /**
     * Sum heartbeat time grouped by week for trends (Phase 5).
     */
    @Query(value = "SELECT DATE_TRUNC('week', created_at) as week_start, " +
           "COALESCE(SUM(CAST(event_data->>'timeSpentSeconds' AS INTEGER)), 0) as total_seconds " +
           "FROM learning_events WHERE student_id = :studentId AND event_type = 'HEARTBEAT' " +
           "AND created_at >= :since GROUP BY week_start ORDER BY week_start",
           nativeQuery = true)
    List<Object[]> sumTimeSpentByWeekSince(@Param("studentId") UUID studentId, @Param("since") Instant since);

    List<LearningEventJpaEntity> findByStudentIdAndEventTypeOrderByCreatedAtDesc(UUID studentId, String eventType);
}
