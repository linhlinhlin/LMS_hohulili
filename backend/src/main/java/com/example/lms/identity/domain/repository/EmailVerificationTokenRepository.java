package com.example.lms.identity.domain.repository;

import com.example.lms.identity.domain.model.EmailVerificationToken;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Port for email verification token persistence.
 * Uses domain model only — no JPA/infrastructure types.
 */
public interface EmailVerificationTokenRepository {

    EmailVerificationToken save(UUID userId, String tokenHash, Instant expiresAt);

    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);

    void markVerifiedByTokenHash(String tokenHash);

    void deleteUnverifiedByUserId(UUID userId);

    void deleteExpired();
}
