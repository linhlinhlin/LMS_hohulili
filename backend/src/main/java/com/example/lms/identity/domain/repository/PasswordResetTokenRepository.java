package com.example.lms.identity.domain.repository;

import com.example.lms.identity.infrastructure.persistence.entity.PasswordResetTokenJpaEntity;

import java.util.Optional;
import java.util.UUID;

/**
 * Port for password reset token persistence.
 */
public interface PasswordResetTokenRepository {

    PasswordResetTokenJpaEntity save(UUID userId, String tokenHash, java.time.Instant expiresAt);

    Optional<PasswordResetTokenJpaEntity> findByTokenHash(String tokenHash);

    void deleteUnusedByUserId(UUID userId);

    void deleteExpired();
}
