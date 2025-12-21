package com.example.lms.shared.infrastructure.outbox;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Outbox Message Entity for reliable event publishing.
 * 
 * Implements the Transactional Outbox Pattern:
 * - Events are stored in the same transaction as domain changes
 * - A separate process publishes events to the message broker
 * - Ensures eventual consistency in distributed systems
 * 
 * @see <a href="https://microservices.io/patterns/data/transactional-outbox.html">Transactional Outbox Pattern</a>
 */
@Entity
@Table(name = "outbox_messages", indexes = {
    @Index(name = "idx_outbox_status", columnList = "status, next_attempt_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OutboxMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * Type of the aggregate (e.g., "Course", "User", "Enrollment")
     */
    @Column(name = "aggregate_type", nullable = false, length = 255)
    private String aggregateType;

    /**
     * ID of the aggregate root
     */
    @Column(name = "aggregate_id", nullable = false)
    private UUID aggregateId;

    /**
     * Type of the event (e.g., "CourseCreated", "UserRegistered")
     */
    @Column(name = "event_type", nullable = false, length = 255)
    private String eventType;

    /**
     * JSON payload of the event
     */
    @Column(name = "payload", columnDefinition = "jsonb", nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    private String payload;

    /**
     * Current status of the message
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    @Builder.Default
    private OutboxStatus status = OutboxStatus.PENDING;

    /**
     * Number of delivery attempts
     */
    @Column(name = "attempts")
    @Builder.Default
    private Integer attempts = 0;

    /**
     * Next scheduled attempt time (for backoff)
     */
    @Column(name = "next_attempt_at")
    private Instant nextAttemptAt;

    /**
     * Error message from last failed attempt
     */
    @Column(name = "last_error", columnDefinition = "TEXT")
    private String lastError;

    /**
     * Timestamp when the message was created
     */
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    /**
     * Timestamp when the message was successfully processed
     */
    @Column(name = "processed_at")
    private Instant processedAt;

    /**
     * Outbox message status enum
     */
    public enum OutboxStatus {
        PENDING,    // Waiting to be published
        PROCESSING, // Currently being processed
        SENT,       // Successfully published
        FAILED,     // Failed after max retries
        DLQ         // Moved to Dead Letter Queue
    }

    // ============ Business Methods ============

    /**
     * Mark message as being processed
     */
    public void markProcessing() {
        this.status = OutboxStatus.PROCESSING;
        this.attempts++;
    }

    /**
     * Mark message as successfully sent
     */
    public void markSent() {
        this.status = OutboxStatus.SENT;
        this.processedAt = Instant.now();
        this.lastError = null;
    }

    /**
     * Mark message as failed with retry
     */
    public void markFailed(String error, Instant nextRetry) {
        this.status = OutboxStatus.PENDING;
        this.lastError = error;
        this.nextAttemptAt = nextRetry;
    }

    /**
     * Mark message as permanently failed (DLQ)
     */
    public void markDeadLetter(String error) {
        this.status = OutboxStatus.DLQ;
        this.lastError = error;
    }

    /**
     * Check if message should be retried
     */
    public boolean shouldRetry(int maxAttempts) {
        return this.attempts < maxAttempts && this.status != OutboxStatus.DLQ;
    }
}
