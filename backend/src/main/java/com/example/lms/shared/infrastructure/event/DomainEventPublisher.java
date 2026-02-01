package com.example.lms.shared.infrastructure.event;

import com.example.lms.shared.domain.event.DomainEvent;

/**
 * Interface for publishing domain events.
 * Implementations can use different mechanisms (Spring Events, Message Queue, etc.)
 */
public interface DomainEventPublisher {
    
    /**
     * Publish a domain event to all registered handlers.
     * 
     * @param event the domain event to publish
     */
    void publish(DomainEvent event);
    
    /**
     * Publish multiple domain events.
     * 
     * @param events the domain events to publish
     */
    default void publishAll(Iterable<? extends DomainEvent> events) {
        events.forEach(this::publish);
    }
}
