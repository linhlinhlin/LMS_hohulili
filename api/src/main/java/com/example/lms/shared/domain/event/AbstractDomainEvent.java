package com.example.lms.shared.domain.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Abstract base implementation of DomainEvent.
 * Provides common functionality for all domain events.
 */
public abstract class AbstractDomainEvent implements DomainEvent {

    private final UUID eventId;
    private final Instant occurredAt;
    private final UUID aggregateId;

    protected AbstractDomainEvent(UUID aggregateId) {
        this.eventId = UUID.randomUUID();
        this.occurredAt = Instant.now();
        this.aggregateId = aggregateId;
    }

    @Override
    public UUID getEventId() {
        return eventId;
    }

    @Override
    public Instant getOccurredAt() {
        return occurredAt;
    }

    @Override
    public UUID getAggregateId() {
        return aggregateId;
    }

    @Override
    public String getEventType() {
        return this.getClass().getSimpleName();
    }

    @Override
    public String getAggregateType() {
        // Derive aggregate type from event class name
        // e.g., "CourseCreatedEvent" -> "Course"
        String eventName = this.getClass().getSimpleName();
        if (eventName.endsWith("Event")) {
            eventName = eventName.substring(0, eventName.length() - 5);
        }
        // Remove common suffixes like "Created", "Updated", "Deleted", etc.
        String[] suffixes = {"Created", "Updated", "Deleted", "Approved", "Rejected", 
                             "Submitted", "Completed", "Enrolled", "Dropped"};
        for (String suffix : suffixes) {
            if (eventName.endsWith(suffix)) {
                return eventName.substring(0, eventName.length() - suffix.length());
            }
        }
        return eventName;
    }

    @Override
    public String toString() {
        return String.format("%s[eventId=%s, aggregateId=%s, occurredAt=%s]",
                getEventType(), eventId, aggregateId, occurredAt);
    }
}

