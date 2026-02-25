package com.example.lms.identity.infrastructure.persistence;

import com.example.lms.identity.infrastructure.persistence.entity.EmailVerificationTokenJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmailVerificationTokenJpaRepository extends JpaRepository<EmailVerificationTokenJpaEntity, UUID> {

    Optional<EmailVerificationTokenJpaEntity> findByTokenHash(String tokenHash);

    void deleteByUserIdAndVerifiedAtIsNull(UUID userId);

    @Modifying
    void deleteByExpiresAtBefore(Instant now);
}
