package com.example.lms.identity.domain.repository;

import com.example.lms.identity.domain.model.PasswordResetToken;

import java.util.Optional;
import java.util.UUID;

/**
 * Port for password reset token persistence.
 * Uses domain model only — no JPA/infrastructure types.
 */
public interface PasswordResetTokenRepository {

    PasswordResetToken save(UUID userId, String tokenHash, java.time.Instant expiresAt);

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    void markUsedByTokenHash(String tokenHash);

    void deleteUnusedByUserId(UUID userId);

    void deleteExpired();
}
