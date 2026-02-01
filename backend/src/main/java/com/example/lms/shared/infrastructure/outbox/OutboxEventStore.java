package com.example.lms.shared.infrastructure.outbox;

import com.example.lms.shared.domain.event.DomainEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Outbox Event Store - Stores domain events in the outbox table.
 * 
 * This component is used by Use Cases to store events atomically
 * with their domain operations, ensuring reliable event publishing.
 * 
 * Usage:
 * <pre>
 * @Transactional
 * public void createCourse(CreateCourseCommand command) {
 *     Course course = Course.create(...);
 *     courseRepository.save(course);
 *     
 *     // Store event in outbox (same transaction)
 *     outboxEventStore.store(new CourseCreatedEvent(course.getId()));
 * }
 * </pre>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxEventStore {

    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    /**
     * Store a domain event in the outbox.
     * Must be called within a transaction.
     */
    public void store(DomainEvent event) {
        store(event.getAggregateType(), event.getAggregateId(), event);
    }

    /**
     * Store an event with explicit aggregate info.
     */
    public void store(String aggregateType, UUID aggregateId, Object event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            String eventType = event.getClass().getSimpleName();

            OutboxMessage message = OutboxMessage.builder()
                .aggregateType(aggregateType)
                .aggregateId(aggregateId)
                .eventType(eventType)
                .payload(payload)
                .build();

            outboxRepository.save(message);
            log.debug("Stored outbox message: {} for {}:{}", eventType, aggregateType, aggregateId);

        } catch (JsonProcessingException e) {
            log.error("Failed to serialize event for outbox: {}", e.getMessage());
            throw new RuntimeException("Failed to store event in outbox", e);
        }
    }

    /**
     * Store multiple events atomically.
     */
    public void storeAll(Iterable<DomainEvent> events) {
        for (DomainEvent event : events) {
            store(event);
        }
    }
}
