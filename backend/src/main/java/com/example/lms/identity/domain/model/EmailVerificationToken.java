package com.example.lms.identity.domain.model;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Domain model for email verification token.
 * Pure domain object — no JPA/infrastructure dependencies.
 * Follows password reset token pattern (SHA-256 hash, single-use, time-expiry).
 */
public class EmailVerificationToken {

    private final UUID id;
    private final UUID userId;
    private final String tokenHash;
    private final Instant expiresAt;
    private Instant verifiedAt;
    private final Instant createdAt;

    public EmailVerificationToken(UUID id, UUID userId, String tokenHash,
                                   Instant expiresAt, Instant verifiedAt, Instant createdAt) {
        this.id = id;
        this.userId = Objects.requireNonNull(userId, "userId không được null");
        this.tokenHash = Objects.requireNonNull(tokenHash, "tokenHash không được null");
        this.expiresAt = Objects.requireNonNull(expiresAt, "expiresAt không được null");
        this.verifiedAt = verifiedAt;
        this.createdAt = createdAt != null ? createdAt : Instant.now();
    }

    public static EmailVerificationToken create(UUID userId, String tokenHash, Instant expiresAt) {
        return new EmailVerificationToken(null, userId, tokenHash, expiresAt, null, Instant.now());
    }

    public boolean isExpired() { return Instant.now().isAfter(expiresAt); }
    public boolean isVerified() { return verifiedAt != null; }
    public void markVerified() { this.verifiedAt = Instant.now(); }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getTokenHash() { return tokenHash; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getVerifiedAt() { return verifiedAt; }
    public Instant getCreatedAt() { return createdAt; }
}
