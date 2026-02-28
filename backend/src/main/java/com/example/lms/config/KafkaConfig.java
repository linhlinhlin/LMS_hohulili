package com.example.lms.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;

import java.util.HashMap;
import java.util.Map;

/**
 * Kafka configuration for event-driven architecture.
 * 
 * This configuration is only active when spring.kafka.enabled=true.
 * In dev mode, set spring.kafka.enabled=false to disable Kafka.
 * 
 * Follows best practices from Google Cloud and AWS:
 * - Topic partitioning for scalability
 * - Idempotent producers
 * - JSON serialization for events
 */
@Configuration
@ConditionalOnProperty(name = "spring.kafka.enabled", havingValue = "true", matchIfMissing = false)
public class KafkaConfig {

    @Value("${spring.kafka.bootstrap-servers:localhost:9092}")
    private String bootstrapServers;

    // ==================== Topics ====================

    @Bean
    public NewTopic userEventsTopic() {
        return TopicBuilder.name("lms.identity.user-events")
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic courseEventsTopic() {
        return TopicBuilder.name("lms.course.events")
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic enrollmentEventsTopic() {
        return TopicBuilder.name("lms.learning.enrollment-events")
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic assessmentEventsTopic() {
        return TopicBuilder.name("lms.assessment.events")
                .partitions(3)
                .replicas(1)
                .build();
    }

    // ==================== Producer Configuration ====================

    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> configProps = new HashMap<>();
        configProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        configProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        configProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        
        // Idempotent producer for exactly-once semantics
        configProps.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        configProps.put(ProducerConfig.ACKS_CONFIG, "all");
        
        // Retry configuration
        configProps.put(ProducerConfig.RETRIES_CONFIG, 3);
        configProps.put(ProducerConfig.RETRY_BACKOFF_MS_CONFIG, 1000);
        
        return new DefaultKafkaProducerFactory<>(configProps);
    }

    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }
}
