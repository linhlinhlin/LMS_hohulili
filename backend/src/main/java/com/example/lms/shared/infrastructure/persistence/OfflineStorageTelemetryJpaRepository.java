package com.example.lms.shared.infrastructure.persistence;

import com.example.lms.shared.infrastructure.persistence.entity.OfflineStorageTelemetryJpaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Repository
public interface OfflineStorageTelemetryJpaRepository extends JpaRepository<OfflineStorageTelemetryJpaEntity, UUID> {

    interface BucketCountProjection {
        String getBucket();
        Long getTotalCount();
    }

    interface DailyTrendProjection {
        LocalDate getBucketDate();
        Long getTotalCount();
        Long getDisabledCount();
        Long getManualResetCount();
        Long getRecreateFailedCount();
    }

    // Native SQL instead of JPQL: Hibernate 6 JPQL parser trips over
    // LOWER(CONCAT('%', :search, '%')) when :search is bound to NULL, raising
    // "operator does not exist: text like text" at runtime. Native SQL tolerates
    // NULL in CONCAT (PostgreSQL concat treats NULL as ''), which is the same
    // pattern every other query in this repository already uses.
    // See issue #77 for the production 500 this caused.
    @Query(
        value = """
            SELECT e.*
            FROM client_offline_storage_telemetry e
            JOIN users u ON u.id = e.user_id
            WHERE (:eventType IS NULL OR e.event_type = :eventType)
              AND (CAST(:userId AS uuid) IS NULL OR e.user_id = CAST(:userId AS uuid))
              AND (:search IS NULL
                   OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(u.full_name) LIKE LOWER(CONCAT('%', :search, '%')))
            ORDER BY e.created_at DESC
            """,
        countQuery = """
            SELECT COUNT(*)
            FROM client_offline_storage_telemetry e
            JOIN users u ON u.id = e.user_id
            WHERE (:eventType IS NULL OR e.event_type = :eventType)
              AND (CAST(:userId AS uuid) IS NULL OR e.user_id = CAST(:userId AS uuid))
              AND (:search IS NULL
                   OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(u.full_name) LIKE LOWER(CONCAT('%', :search, '%')))
            """,
        nativeQuery = true
    )
    Page<OfflineStorageTelemetryJpaEntity> findFiltered(String eventType, UUID userId, String search, Pageable pageable);

    @Query(value = """
        SELECT COUNT(*)
        FROM client_offline_storage_telemetry e
        JOIN users u ON u.id = e.user_id
        WHERE e.occurred_at >= :since
          AND (:eventType IS NULL OR e.event_type = :eventType)
          AND (:userId IS NULL OR e.user_id = :userId)
          AND (:search IS NULL
               OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(u.full_name) LIKE LOWER(CONCAT('%', :search, '%')))
        """, nativeQuery = true)
    long countSince(String eventType, UUID userId, String search, Instant since);

    @Query(value = """
        SELECT COUNT(DISTINCT e.user_id)
        FROM client_offline_storage_telemetry e
        JOIN users u ON u.id = e.user_id
        WHERE e.occurred_at >= :since
          AND (:eventType IS NULL OR e.event_type = :eventType)
          AND (:userId IS NULL OR e.user_id = :userId)
          AND (:search IS NULL
               OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(u.full_name) LIKE LOWER(CONCAT('%', :search, '%')))
        """, nativeQuery = true)
    long countDistinctUsersSince(String eventType, UUID userId, String search, Instant since);

    @Query(value = """
        SELECT COUNT(*)
        FROM client_offline_storage_telemetry e
        JOIN users u ON u.id = e.user_id
        WHERE e.occurred_at >= :since
          AND e.requires_redownload = true
          AND (:eventType IS NULL OR e.event_type = :eventType)
          AND (:userId IS NULL OR e.user_id = :userId)
          AND (:search IS NULL
               OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(u.full_name) LIKE LOWER(CONCAT('%', :search, '%')))
        """, nativeQuery = true)
    long countRequiresRedownloadSince(String eventType, UUID userId, String search, Instant since);

    @Query(value = """
        SELECT e.event_type AS bucket, COUNT(*) AS totalCount
        FROM client_offline_storage_telemetry e
        JOIN users u ON u.id = e.user_id
        WHERE e.occurred_at >= :since
          AND (:eventType IS NULL OR e.event_type = :eventType)
          AND (:userId IS NULL OR e.user_id = :userId)
          AND (:search IS NULL
               OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(u.full_name) LIKE LOWER(CONCAT('%', :search, '%')))
        GROUP BY e.event_type
        ORDER BY totalCount DESC, bucket ASC
        """, nativeQuery = true)
    java.util.List<BucketCountProjection> aggregateEventTypesSince(String eventType, UUID userId, String search, Instant since);

    @Query(value = """
        SELECT e.availability AS bucket, COUNT(*) AS totalCount
        FROM client_offline_storage_telemetry e
        JOIN users u ON u.id = e.user_id
        WHERE e.occurred_at >= :since
          AND (:eventType IS NULL OR e.event_type = :eventType)
          AND (:userId IS NULL OR e.user_id = :userId)
          AND (:search IS NULL
               OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(u.full_name) LIKE LOWER(CONCAT('%', :search, '%')))
        GROUP BY e.availability
        ORDER BY totalCount DESC, bucket ASC
        """, nativeQuery = true)
    java.util.List<BucketCountProjection> aggregateAvailabilitySince(String eventType, UUID userId, String search, Instant since);

    @Query(value = """
        SELECT COALESCE(NULLIF(TRIM(e.route), ''), '(unknown)') AS bucket, COUNT(*) AS totalCount
        FROM client_offline_storage_telemetry e
        JOIN users u ON u.id = e.user_id
        WHERE e.occurred_at >= :since
          AND (:eventType IS NULL OR e.event_type = :eventType)
          AND (:userId IS NULL OR e.user_id = :userId)
          AND (:search IS NULL
               OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(u.full_name) LIKE LOWER(CONCAT('%', :search, '%')))
        GROUP BY COALESCE(NULLIF(TRIM(e.route), ''), '(unknown)')
        ORDER BY totalCount DESC, bucket ASC
        LIMIT 5
        """, nativeQuery = true)
    java.util.List<BucketCountProjection> topRoutesSince(String eventType, UUID userId, String search, Instant since);

    @Query(value = """
        SELECT COALESCE(NULLIF(TRIM(e.platform), ''), '(unknown)') AS bucket, COUNT(*) AS totalCount
        FROM client_offline_storage_telemetry e
        JOIN users u ON u.id = e.user_id
        WHERE e.occurred_at >= :since
          AND (:eventType IS NULL OR e.event_type = :eventType)
          AND (:userId IS NULL OR e.user_id = :userId)
          AND (:search IS NULL
               OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(u.full_name) LIKE LOWER(CONCAT('%', :search, '%')))
        GROUP BY COALESCE(NULLIF(TRIM(e.platform), ''), '(unknown)')
        ORDER BY totalCount DESC, bucket ASC
        """, nativeQuery = true)
    java.util.List<BucketCountProjection> aggregatePlatformsSince(String eventType, UUID userId, String search, Instant since);

    @Query(value = """
        SELECT COALESCE(NULLIF(TRIM(e.user_agent), ''), '(unknown)') AS bucket, COUNT(*) AS totalCount
        FROM client_offline_storage_telemetry e
        JOIN users u ON u.id = e.user_id
        WHERE e.occurred_at >= :since
          AND (:eventType IS NULL OR e.event_type = :eventType)
          AND (:userId IS NULL OR e.user_id = :userId)
          AND (:search IS NULL
               OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(u.full_name) LIKE LOWER(CONCAT('%', :search, '%')))
        GROUP BY COALESCE(NULLIF(TRIM(e.user_agent), ''), '(unknown)')
        ORDER BY totalCount DESC, bucket ASC
        """, nativeQuery = true)
    java.util.List<BucketCountProjection> aggregateUserAgentsSince(String eventType, UUID userId, String search, Instant since);

    @Query(value = """
        SELECT
            DATE(e.occurred_at AT TIME ZONE 'UTC') AS bucketDate,
            COUNT(*) AS totalCount,
            SUM(CASE WHEN e.event_type = 'disabled' THEN 1 ELSE 0 END) AS disabledCount,
            SUM(CASE WHEN e.event_type = 'manual-reset' THEN 1 ELSE 0 END) AS manualResetCount,
            SUM(CASE WHEN e.event_type = 'recreate-failed' THEN 1 ELSE 0 END) AS recreateFailedCount
        FROM client_offline_storage_telemetry e
        JOIN users u ON u.id = e.user_id
        WHERE e.occurred_at >= :since
          AND (:eventType IS NULL OR e.event_type = :eventType)
          AND (:userId IS NULL OR e.user_id = :userId)
          AND (:search IS NULL
               OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(u.full_name) LIKE LOWER(CONCAT('%', :search, '%')))
        GROUP BY DATE(e.occurred_at AT TIME ZONE 'UTC')
        ORDER BY bucketDate ASC
        """, nativeQuery = true)
    java.util.List<DailyTrendProjection> dailyTrendSince(String eventType, UUID userId, String search, Instant since);
}
