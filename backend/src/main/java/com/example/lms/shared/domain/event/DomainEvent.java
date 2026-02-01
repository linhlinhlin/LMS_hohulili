package com.example.lms.shared.domain.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Interface for all domain events.
 * Domain events represent something that happened in the domain
 * that domain experts care about.
 */
public interface DomainEvent {

    /**
     * Unique identifier for this event instance.
     */
    UUID getEventId();

    /**
     * When this event occurred.
     */
    Instant getOccurredAt();

    /**
     * Type name of the event (e.g., "CourseCreated", "StudentEnrolled").
     */
    String getEventType();

    /**
     * The aggregate ID that this event belongs to.
     */
    UUID getAggregateId();

    /**
     * The aggregate type that this event belongs to (e.g., "Course", "User").
     * Used by Transactional Outbox pattern for message routing.
     */
    String getAggregateType();
}

