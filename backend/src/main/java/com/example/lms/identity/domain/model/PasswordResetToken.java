package com.example.lms.identity.domain.model;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Domain model for password reset token.
 * Pure domain object — no JPA/infrastructure dependencies.
 *
 * OWASP-compliant: SHA-256 hash storage, single-use, time-expiry.
 */
public class PasswordResetToken {

    private final UUID id;
    private final UUID userId;
    private final String tokenHash;
    private final Instant expiresAt;
    private Instant usedAt;
    private final Instant createdAt;

    public PasswordResetToken(UUID id, UUID userId, String tokenHash,
                               Instant expiresAt, Instant usedAt, Instant createdAt) {
        this.id = id;
        this.userId = Objects.requireNonNull(userId, "userId không được null");
        this.tokenHash = Objects.requireNonNull(tokenHash, "tokenHash không được null");
        this.expiresAt = Objects.requireNonNull(expiresAt, "expiresAt không được null");
        this.usedAt = usedAt;
        this.createdAt = createdAt != null ? createdAt : Instant.now();
    }

    /**
     * Factory method to create a new token (before persistence assigns ID).
     */
    public static PasswordResetToken create(UUID userId, String tokenHash, Instant expiresAt) {
        return new PasswordResetToken(null, userId, tokenHash, expiresAt, null, Instant.now());
    }

    // Business methods
    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public boolean isUsed() {
        return usedAt != null;
    }

    public void markUsed() {
        this.usedAt = Instant.now();
    }

    // Getters
    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getTokenHash() { return tokenHash; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getUsedAt() { return usedAt; }
    public Instant getCreatedAt() { return createdAt; }
}
