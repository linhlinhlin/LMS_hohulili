package com.example.lms.shared.domain.model;

import com.example.lms.shared.domain.event.DomainEvent;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Base class for aggregate roots in DDD.
 * Pure domain class — no JPA annotations (Clean Architecture).
 *
 * Provides support for domain events that can be published
 * after the aggregate is persisted.
 */
public abstract class AggregateRoot extends BaseEntity {

    private final transient List<DomainEvent> domainEvents = new ArrayList<>();

    /**
     * Register a domain event to be published after persistence.
     */
    protected void registerEvent(DomainEvent event) {
        if (event != null) {
            domainEvents.add(event);
        }
    }

    /**
     * Get all registered domain events.
     */
    public List<DomainEvent> getDomainEvents() {
        return Collections.unmodifiableList(domainEvents);
    }

    /**
     * Clear all registered domain events.
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
