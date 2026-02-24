package com.example.lms.identity.infrastructure.persistence;

import com.example.lms.identity.domain.model.PasswordResetToken;
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
    public PasswordResetToken save(UUID userId, String tokenHash, Instant expiresAt) {
        var entity = new PasswordResetTokenJpaEntity(userId, tokenHash, expiresAt);
        var saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<PasswordResetToken> findByTokenHash(String tokenHash) {
        return jpaRepository.findByTokenHash(tokenHash).map(this::toDomain);
    }

    @Override
    @Transactional
    public void markUsedByTokenHash(String tokenHash) {
        jpaRepository.findByTokenHash(tokenHash).ifPresent(entity -> {
            entity.setUsedAt(Instant.now());
            jpaRepository.save(entity);
        });
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

    private PasswordResetToken toDomain(PasswordResetTokenJpaEntity entity) {
        return new PasswordResetToken(
                entity.getId(),
                entity.getUserId(),
                entity.getTokenHash(),
                entity.getExpiresAt(),
                entity.getUsedAt(),
                entity.getCreatedAt()
        );
    }
}
