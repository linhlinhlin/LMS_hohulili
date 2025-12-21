package com.example.lms.shared.domain.model;

import com.example.lms.shared.domain.event.DomainEvent;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.Transient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Base class for aggregate roots in DDD.
 * Aggregate roots are the entry point to an aggregate and are responsible
 * for maintaining the consistency of the aggregate.
 * 
 * This class provides support for domain events that can be published
 * after the aggregate is persisted.
 */
@MappedSuperclass
public abstract class AggregateRoot extends BaseEntity {

    @Transient
    private final List<DomainEvent> domainEvents = new ArrayList<>();

    /**
     * Register a domain event to be published after persistence.
     * Events are cleared after being retrieved.
     */
    protected void registerEvent(DomainEvent event) {
        if (event != null) {
            domainEvents.add(event);
        }
    }

    /**
     * Get all registered domain events.
     * Returns an unmodifiable view of the events.
     */
    public List<DomainEvent> getDomainEvents() {
        return Collections.unmodifiableList(domainEvents);
    }

    /**
     * Clear all registered domain events.
     * Should be called after events have been published.
     */
    public void clearDomainEvents() {
        domainEvents.clear();
    }

    /**
     * Check if there are any pending domain events.
     */
    public boolean hasDomainEvents() {
        return !domainEvents.isEmpty();
    }
}
