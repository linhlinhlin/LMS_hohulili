package com.example.lms.identity.infrastructure.persistence;

import com.example.lms.identity.domain.model.EmailVerificationToken;
import com.example.lms.identity.domain.repository.EmailVerificationTokenRepository;
import com.example.lms.identity.infrastructure.persistence.entity.EmailVerificationTokenJpaEntity;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Component
public class EmailVerificationTokenRepositoryAdapter implements EmailVerificationTokenRepository {

    private final EmailVerificationTokenJpaRepository jpaRepository;

    public EmailVerificationTokenRepositoryAdapter(EmailVerificationTokenJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    @Transactional
    public EmailVerificationToken save(UUID userId, String tokenHash, Instant expiresAt) {
        var entity = new EmailVerificationTokenJpaEntity(userId, tokenHash, expiresAt);
        var saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<EmailVerificationToken> findByTokenHash(String tokenHash) {
        return jpaRepository.findByTokenHash(tokenHash).map(this::toDomain);
    }

    @Override
    @Transactional
    public void markVerifiedByTokenHash(String tokenHash) {
        jpaRepository.findByTokenHash(tokenHash).ifPresent(entity -> {
            entity.setVerifiedAt(Instant.now());
            jpaRepository.save(entity);
        });
    }

    @Override
    @Transactional
    public void deleteUnverifiedByUserId(UUID userId) {
        jpaRepository.deleteByUserIdAndVerifiedAtIsNull(userId);
    }

    @Override
    @Transactional
    public void deleteExpired() {
        jpaRepository.deleteByExpiresAtBefore(Instant.now());
    }

    private EmailVerificationToken toDomain(EmailVerificationTokenJpaEntity entity) {
        return new EmailVerificationToken(
                entity.getId(),
                entity.getUserId(),
                entity.getTokenHash(),
                entity.getExpiresAt(),
                entity.getVerifiedAt(),
                entity.getCreatedAt()
        );
    }
}
