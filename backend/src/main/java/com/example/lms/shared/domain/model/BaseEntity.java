package com.example.lms.shared.domain.model;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Base entity class providing common fields for all domain entities.
 * Pure domain class — no JPA annotations (Clean Architecture).
 */
public abstract class BaseEntity {

    private UUID id;
    private Instant createdAt;
    private Instant updatedAt;

    protected BaseEntity() {
        this.id = UUID.randomUUID();
        this.createdAt = Instant.now();
    }

    // Getters
    public UUID getId() {
        return id;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    // Protected setters for construction & reconstitution
    protected void setId(UUID id) {
        this.id = id;
    }

    protected void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    protected void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        BaseEntity that = (BaseEntity) o;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
