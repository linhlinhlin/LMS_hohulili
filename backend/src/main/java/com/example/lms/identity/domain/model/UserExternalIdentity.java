package com.example.lms.identity.domain.model;

import com.example.lms.shared.domain.valueobject.UserId;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public class UserExternalIdentity {

    private UUID id;
    private UserId userId;
    private ExternalIdentityProvider provider;
    private String externalSubject;
    private String emailAtLink;
    private Instant emailVerifiedAt;
    private Instant linkedAt;
    private Instant lastLoginAt;
    private Instant createdAt;
    private Instant updatedAt;

    private UserExternalIdentity() {}

    public UserExternalIdentity(
            UUID id,
            UserId userId,
            ExternalIdentityProvider provider,
            String externalSubject,
            String emailAtLink,
            Instant emailVerifiedAt,
            Instant linkedAt,
            Instant lastLoginAt,
            Instant createdAt,
            Instant updatedAt
    ) {
        this.id = id;
        this.userId = Objects.requireNonNull(userId, "User ID khong duoc null");
        this.provider = Objects.requireNonNull(provider, "Provider khong duoc null");
        this.externalSubject = normalizeRequired(externalSubject, "External subject khong duoc de trong");
        this.emailAtLink = normalizeRequired(emailAtLink, "Email link khong duoc de trong");
        this.emailVerifiedAt = emailVerifiedAt;
        this.linkedAt = linkedAt != null ? linkedAt : Instant.now();
        this.lastLoginAt = lastLoginAt;
        this.createdAt = createdAt != null ? createdAt : Instant.now();
        this.updatedAt = updatedAt;
    }

    public static UserExternalIdentity linkGoogle(
            UserId userId,
            String externalSubject,
            String emailAtLink,
            Instant emailVerifiedAt
    ) {
        Instant now = Instant.now();
        return new UserExternalIdentity(
                null,
                userId,
                ExternalIdentityProvider.GOOGLE,
                externalSubject,
                emailAtLink,
                emailVerifiedAt,
                now,
                now,
                now,
                null
        );
    }

    public void markLogin() {
        this.lastLoginAt = Instant.now();
        this.updatedAt = this.lastLoginAt;
    }

    private static String normalizeRequired(String value, String message) {
        String normalized = value != null ? value.trim() : null;
        if (normalized == null || normalized.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return normalized;
    }

    public UUID getId() {
        return id;
    }

    public UserId getUserId() {
        return userId;
    }

    public ExternalIdentityProvider getProvider() {
        return provider;
    }

    public String getExternalSubject() {
        return externalSubject;
    }

    public String getEmailAtLink() {
        return emailAtLink;
    }

    public Instant getEmailVerifiedAt() {
        return emailVerifiedAt;
    }

    public Instant getLinkedAt() {
        return linkedAt;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
