package com.example.lms.shared.infrastructure.event;

import com.example.lms.shared.domain.event.DomainEvent;
import com.example.lms.shared.domain.event.DomainEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/**
 * Kafka-based implementation of DomainEventPublisher.
 *
 * This publisher sends domain events to Kafka topics for asynchronous
 * processing by other bounded contexts.
 *
 * This bean is only created when KafkaTemplate is available.
 * When Kafka is not configured, SpringEventPublisher (marked @Primary) handles events.
 */
@Component
@ConditionalOnBean(KafkaTemplate.class)
@RequiredArgsConstructor
@Slf4j
public class KafkaDomainEventPublisher implements DomainEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    private static final String USER_EVENTS_TOPIC = "lms.identity.user-events";
    private static final String COURSE_EVENTS_TOPIC = "lms.course.events";
    private static final String ENROLLMENT_EVENTS_TOPIC = "lms.learning.enrollment-events";
    private static final String ASSESSMENT_EVENTS_TOPIC = "lms.assessment.events";

    @Override
    public void publish(DomainEvent event) {
        String topic = determineTopicForEvent(event);
        String key = event.getAggregateId() != null ? event.getAggregateId().toString() : null;

        log.info("Publishing event {} to topic {} with key {}", 
                event.getClass().getSimpleName(), topic, key);

        kafkaTemplate.send(topic, key, event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to publish event {} to topic {}: {}", 
                                event.getClass().getSimpleName(), topic, ex.getMessage());
                    } else {
                        log.debug("Successfully published event {} to topic {} partition {} offset {}",
                                event.getClass().getSimpleName(), 
                                result.getRecordMetadata().topic(),
                                result.getRecordMetadata().partition(),
                                result.getRecordMetadata().offset());
                    }
                });
    }

    /**
     * Determine the appropriate Kafka topic based on event type.
     */
    private String determineTopicForEvent(DomainEvent event) {
        String className = event.getClass().getSimpleName();
        
        if (className.contains("User")) {
            return USER_EVENTS_TOPIC;
        } else if (className.contains("Course")) {
            return COURSE_EVENTS_TOPIC;
        } else if (className.contains("Enroll") || className.contains("Class")) {
            return ENROLLMENT_EVENTS_TOPIC;
        } else if (className.contains("Quiz") || className.contains("Assessment")) {
            return ASSESSMENT_EVENTS_TOPIC;
        }
        
        // Default topic for unknown events
        log.warn("Unknown event type {}, using user-events topic", className);
        return USER_EVENTS_TOPIC;
    }
}
