package com.example.lms.shared.infrastructure.outbox;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Repository for Outbox Messages.
 * 
 * Uses pessimistic locking to prevent multiple publishers
 * from processing the same message.
 */
@Repository
public interface OutboxRepository extends JpaRepository<OutboxMessage, UUID> {

    /**
     * Find pending messages ready for publishing.
     * Uses SKIP LOCKED to allow concurrent publishers.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT m FROM OutboxMessage m 
        WHERE m.status = 'PENDING' 
        AND (m.nextAttemptAt IS NULL OR m.nextAttemptAt <= :now)
        ORDER BY m.createdAt ASC
        """)
    List<OutboxMessage> findPendingMessages(@Param("now") Instant now);

    /**
     * Find messages for a specific aggregate.
     */
    List<OutboxMessage> findByAggregateTypeAndAggregateId(String aggregateType, UUID aggregateId);

    /**
     * Count pending messages (for monitoring).
     */
    @Query("SELECT COUNT(m) FROM OutboxMessage m WHERE m.status = 'PENDING'")
    long countPending();

    /**
     * Count failed messages (for monitoring).
     */
    @Query("SELECT COUNT(m) FROM OutboxMessage m WHERE m.status = 'FAILED' OR m.status = 'DLQ'")
    long countFailed();

    /**
     * Find messages older than retention period for cleanup.
     */
    @Query("SELECT m FROM OutboxMessage m WHERE m.status = 'SENT' AND m.processedAt < :before")
    List<OutboxMessage> findProcessedBefore(@Param("before") Instant before);
}
