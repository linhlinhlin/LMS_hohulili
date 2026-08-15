package com.example.lms.identity.domain.model;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Organization-scoped feature flag. Keeps VMU-specific behavior as data, not code branches.
 */
public class OrganizationCapability {
    private static final Pattern KEY_PATTERN = Pattern.compile("^[a-z][a-z0-9_]{1,63}$");

    private final UUID id;
    private final UUID organizationId;
    private final String key;
    private boolean enabled;
    private final Instant createdAt;
    private Instant updatedAt;

    public OrganizationCapability(
            UUID id,
            UUID organizationId,
            String key,
            boolean enabled,
            Instant createdAt,
            Instant updatedAt) {
        this.id = Objects.requireNonNull(id, "Capability id is required");
        this.organizationId = Objects.requireNonNull(organizationId, "Organization id is required");
        this.key = normalizeKey(key);
        this.enabled = enabled;
        this.createdAt = createdAt != null ? createdAt : Instant.now();
        this.updatedAt = updatedAt;
    }

    public static OrganizationCapability create(UUID organizationId, String key, boolean enabled) {
        return new OrganizationCapability(UUID.randomUUID(), organizationId, key, enabled, Instant.now(), null);
    }

    public void setEnabled(boolean enabled) {
        if (this.enabled != enabled) {
            this.enabled = enabled;
            this.updatedAt = Instant.now();
        }
    }

    public static String normalizeKey(String key) {
        String normalized = Objects.requireNonNull(key, "Capability key is required").trim().toLowerCase();
        if (!KEY_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("Capability key must match ^[a-z][a-z0-9_]{1,63}$");
        }
        return normalized;
    }

    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public String getKey() { return key; }
    public boolean isEnabled() { return enabled; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
