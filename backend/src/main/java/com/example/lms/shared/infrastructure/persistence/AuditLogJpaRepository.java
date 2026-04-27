package com.example.lms.shared.infrastructure.persistence;

import com.example.lms.shared.infrastructure.persistence.entity.AuditLogJpaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface AuditLogJpaRepository extends JpaRepository<AuditLogJpaEntity, Long> {

    Page<AuditLogJpaEntity> findAllByOrderByChangedAtDesc(Pageable pageable);

    /**
     * Existing simple filter (table + action) preserved for backwards
     * compatibility. New callers should prefer {@link #search(String, String,
     * Instant, Instant, String, String, Pageable)} which also supports
     * date-range and actor-identity filtering (issues #187, #188).
     */
    @Query("SELECT a FROM AuditLogJpaEntity a WHERE " +
            "(:tableName IS NULL OR a.tableName = :tableName) AND " +
            "(:action IS NULL OR a.action = :action) " +
            "ORDER BY a.changedAt DESC")
    Page<AuditLogJpaEntity> findFiltered(
            @Param("tableName") String tableName,
            @Param("action") String action,
            Pageable pageable
    );

    /**
     * Combined filter used by {@code SearchAuditLogUseCase}.
     *
     * <p>Date range is half-open {@code [from, to)} — the boundary instant on
     * {@code to} is excluded so two adjacent windows do not double-count
     * (matches {@code GetWindowedAnalyticsUseCase}).
     *
     * <p>Actor filtering joins {@code users} on {@code changed_by = u.id} and
     * does a case-insensitive {@code LIKE} on email and full name. When an
     * actor filter is set, rows whose {@code changed_by} does not resolve to a
     * user are excluded automatically (the JOIN drops them); when no actor
     * filter is set the LEFT JOIN keeps system-generated rows.
     */
    @Query("SELECT a FROM AuditLogJpaEntity a " +
            "LEFT JOIN com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity u " +
            "  ON u.id = a.changedBy " +
            "WHERE (:tableName IS NULL OR a.tableName = :tableName) " +
            "  AND (:action IS NULL OR a.action = :action) " +
            "  AND (:from IS NULL OR a.changedAt >= :from) " +
            "  AND (:to IS NULL OR a.changedAt < :to) " +
            "  AND (:actorEmailPattern IS NULL " +
            "       OR (u.email IS NOT NULL AND LOWER(u.email) LIKE :actorEmailPattern)) " +
            "  AND (:actorNamePattern IS NULL " +
            "       OR (u.fullName IS NOT NULL AND LOWER(u.fullName) LIKE :actorNamePattern)) " +
            "ORDER BY a.changedAt DESC")
    Page<AuditLogJpaEntity> search(
            @Param("tableName") String tableName,
            @Param("action") String action,
            @Param("from") Instant from,
            @Param("to") Instant to,
            // Phase 8: pre-built lowercase LIKE pattern thay CONCAT() trong JPQL
            // → PostgreSQL JDBC bind explicit String, không infer bytea.
            // Adapter responsible: actorEmail != null ? "%" + actorEmail.toLowerCase() + "%" : null
            @Param("actorEmailPattern") String actorEmailPattern,
            @Param("actorNamePattern") String actorNamePattern,
            Pageable pageable
    );
}
