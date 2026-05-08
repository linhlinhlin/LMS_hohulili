package com.example.lms.competency_mapping.domain.model;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public class StandardCompetency {

    private final UUID id;
    private final UUID standardId;
    private String code;
    private String title;
    private String description;
    private String category;
    private int displayOrder;
    private boolean active;
    private final Instant createdAt;
    private Instant updatedAt;

    private StandardCompetency(UUID id, UUID standardId, String code, String title,
                                String description, String category, int displayOrder,
                                boolean active, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.standardId = standardId;
        this.code = code;
        this.title = title;
        this.description = description;
        this.category = category;
        this.displayOrder = displayOrder;
        this.active = active;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static StandardCompetency reconstitute(UUID id, UUID standardId, String code, String title,
                                                   String description, String category, int displayOrder,
                                                   boolean active, Instant createdAt, Instant updatedAt) {
        return new StandardCompetency(id, standardId, code, title, description, category,
                displayOrder, active, createdAt, updatedAt);
    }

    public UUID getId() { return id; }
    public UUID getStandardId() { return standardId; }
    public String getCode() { return code; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getCategory() { return category; }
    public int getDisplayOrder() { return displayOrder; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof StandardCompetency c)) return false;
        return Objects.equals(id, c.id);
    }

    @Override
    public int hashCode() { return Objects.hash(id); }
}
