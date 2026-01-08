package com.example.lms.shared.exception;

import java.util.UUID;

/**
 * Exception thrown when a requested entity is not found.
 */
public class EntityNotFoundException extends DomainException {

    private final String entityType;
    private final String entityId;

    public EntityNotFoundException(String entityType, UUID id) {
        super("NOT_FOUND", String.format("Không tìm thấy %s với ID: %s", entityType, id));
        this.entityType = entityType;
        this.entityId = id != null ? id.toString() : null;
    }

    public EntityNotFoundException(String entityType, String identifier) {
        super("NOT_FOUND", String.format("Không tìm thấy %s: %s", entityType, identifier));
        this.entityType = entityType;
        this.entityId = identifier;
    }

    public EntityNotFoundException(Class<?> entityClass, UUID id) {
        this(entityClass.getSimpleName(), id);
    }

    public String getEntityType() {
        return entityType;
    }

    public String getEntityId() {
        return entityId;
    }
}
