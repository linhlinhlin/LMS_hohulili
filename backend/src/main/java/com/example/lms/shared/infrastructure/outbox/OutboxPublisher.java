package com.example.lms.shared.infrastructure.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Outbox Publisher - Scheduled job that publishes pending outbox messages.
 * 
 * Implements the reliable message publishing part of Transactional Outbox Pattern:
 * - Polls outbox table for pending messages
 * - Publishes to Kafka with at-least-once semantics
 * - Implements exponential backoff for retries
 * - Moves permanently failed messages to DLQ
 * 
 * This bean is only created when KafkaTemplate is available.
 * 
 * @see <a href="https://microservices.io/patterns/data/transactional-outbox.html">Transactional Outbox Pattern</a>
 */
@Component
@ConditionalOnBean(KafkaTemplate.class)
@RequiredArgsConstructor
@Slf4j
public class OutboxPublisher {

    private final OutboxRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    private static final int MAX_ATTEMPTS = 5;
    private static final int BATCH_SIZE = 100;
    private static final Duration BASE_BACKOFF = Duration.ofSeconds(30);

    /**
     * Scheduled job to publish pending outbox messages.
     * Runs every 5 seconds.
     */
    @Scheduled(fixedRate = 5000)
    @Transactional
    public void publishPendingMessages() {
        List<OutboxMessage> messages = outboxRepository.findPendingMessages(Instant.now())
            .stream()
            .limit(BATCH_SIZE)
            .toList();

        if (messages.isEmpty()) {
            return;
        }

        log.debug("Publishing {} pending outbox messages", messages.size());

        for (OutboxMessage message : messages) {
            publishMessage(message);
        }
    }

    /**
     * Publish a single message to Kafka.
     */
    private void publishMessage(OutboxMessage message) {
        try {
            message.markProcessing();
            
            String topic = buildTopicName(message.getAggregateType(), message.getEventType());
            String key = message.getAggregateId().toString();
            String payload = message.getPayload();

            kafkaTemplate.send(topic, key, payload)
                .whenComplete((result, ex) -> {
                    if (ex == null) {
                        handleSuccess(message);
                    } else {
                        handleFailure(message, ex);
                    }
                });

        } catch (RuntimeException e) {
            log.error("Error publishing outbox message {}: {}", message.getId(), e.getMessage());
            handleFailure(message, e);
        }
    }

    /**
     * Handle successful message publishing.
     */
    private void handleSuccess(OutboxMessage message) {
        log.debug("Successfully published outbox message: {}", message.getId());
        message.markSent();
        outboxRepository.save(message);
    }

    /**
     * Handle failed message publishing with retry logic.
     */
    private void handleFailure(OutboxMessage message, Throwable error) {
        log.warn("Failed to publish outbox message {}: {}", message.getId(), error.getMessage());

        if (message.shouldRetry(MAX_ATTEMPTS)) {
            // Calculate exponential backoff
            Duration backoff = BASE_BACKOFF.multipliedBy((long) Math.pow(2, message.getAttempts() - 1));
            Instant nextRetry = Instant.now().plus(backoff);
            
            message.markFailed(error.getMessage(), nextRetry);
            log.info("Will retry message {} at {}", message.getId(), nextRetry);
        } else {
            // Move to Dead Letter Queue
            message.markDeadLetter(error.getMessage());
            log.error("Message {} moved to DLQ after {} attempts", message.getId(), message.getAttempts());
        }
        
        outboxRepository.save(message);
    }

    /**
     * Build Kafka topic name from aggregate and event type.
     */
    private String buildTopicName(String aggregateType, String eventType) {
        return String.format("lms.%s.%s", 
            aggregateType.toLowerCase(), 
            eventType.toLowerCase().replace("event", ""));
    }

    /**
     * Cleanup old processed messages.
     * Runs daily at 3 AM.
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupOldMessages() {
        Instant retentionDate = Instant.now().minus(Duration.ofDays(7));
        List<OutboxMessage> oldMessages = outboxRepository.findProcessedBefore(retentionDate);
        
        if (!oldMessages.isEmpty()) {
            log.info("Cleaning up {} old outbox messages", oldMessages.size());
            outboxRepository.deleteAll(oldMessages);
        }
    }
}
