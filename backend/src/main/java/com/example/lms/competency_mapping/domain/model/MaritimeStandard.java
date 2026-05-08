package com.example.lms.competency_mapping.domain.model;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public class MaritimeStandard {

    private final UUID id;
    private String code;
    private String name;
    private String description;
    private boolean active;
    private final Instant createdAt;
    private Instant updatedAt;

    private MaritimeStandard(UUID id, String code, String name, String description,
                              boolean active, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.code = code;
        this.name = name;
        this.description = description;
        this.active = active;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static MaritimeStandard reconstitute(UUID id, String code, String name, String description,
                                                 boolean active, Instant createdAt, Instant updatedAt) {
        return new MaritimeStandard(id, code, name, description, active, createdAt, updatedAt);
    }

    public UUID getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof MaritimeStandard s)) return false;
        return Objects.equals(id, s.id);
    }

    @Override
    public int hashCode() { return Objects.hash(id); }
}
