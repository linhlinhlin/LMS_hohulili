package com.example.lms.identity.infrastructure.persistence;

import com.example.lms.identity.domain.repository.PasswordResetTokenRepository;
import com.example.lms.identity.infrastructure.persistence.entity.PasswordResetTokenJpaEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PasswordResetTokenRepositoryAdapter implements PasswordResetTokenRepository {

    private final PasswordResetTokenJpaRepository jpaRepository;

    @Override
    public PasswordResetTokenJpaEntity save(UUID userId, String tokenHash, Instant expiresAt) {
        var entity = new PasswordResetTokenJpaEntity(userId, tokenHash, expiresAt);
        return jpaRepository.save(entity);
    }

    @Override
    public Optional<PasswordResetTokenJpaEntity> findByTokenHash(String tokenHash) {
        return jpaRepository.findByTokenHash(tokenHash);
    }

    @Override
    @Transactional
    public void deleteUnusedByUserId(UUID userId) {
        jpaRepository.deleteByUserIdAndUsedAtIsNull(userId);
    }

    @Override
    @Transactional
    public void deleteExpired() {
        jpaRepository.deleteByExpiresAtBefore(Instant.now());
    }
}
