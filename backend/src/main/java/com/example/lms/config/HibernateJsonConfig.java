package com.example.lms.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.hypersistence.utils.hibernate.type.util.ObjectMapperSupplier;

/**
 * Custom ObjectMapper supplier for Hypersistence Utils' JsonType.
 * Registers JavaTimeModule for proper Instant/LocalDateTime serialization in JSONB columns.
 * Referenced via hibernate property: hypersistence.utils.jackson.object.mapper
 */
public class HibernateJsonConfig implements ObjectMapperSupplier {

    @Override
    public ObjectMapper get() {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return objectMapper;
    }
}
