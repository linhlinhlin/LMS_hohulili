package com.example.lms.shared.infrastructure.event;

import com.example.lms.shared.domain.event.DomainEvent;
import com.example.lms.shared.domain.event.DomainEventPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * Spring-based implementation of DomainEventPublisher.
 * Uses Spring's ApplicationEventPublisher to publish domain events.
 * This is marked as @Primary to be used by default when multiple publishers exist.
 */
@Component
@Primary
public class SpringEventPublisher implements DomainEventPublisher {
    
    private static final Logger log = LoggerFactory.getLogger(SpringEventPublisher.class);
    
    private final ApplicationEventPublisher applicationEventPublisher;
    
    public SpringEventPublisher(ApplicationEventPublisher applicationEventPublisher) {
        this.applicationEventPublisher = applicationEventPublisher;
    }
    
    @Override
    public void publish(DomainEvent event) {
        log.info("Publishing domain event: {} [eventId={}, aggregateId={}]",
            event.getEventType(),
            event.getEventId(),
            event.getAggregateId());
        
        applicationEventPublisher.publishEvent(event);
        
        log.debug("Domain event published successfully: {}", event.getEventId());
    }
}
