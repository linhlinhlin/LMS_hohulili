package com.example.lms.identity.infrastructure.persistence.repository;

import com.example.lms.identity.infrastructure.persistence.entity.UserExternalIdentityJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserExternalIdentityJpaRepository extends JpaRepository<UserExternalIdentityJpaEntity, UUID> {

    Optional<UserExternalIdentityJpaEntity> findByProviderAndExternalSubject(
            UserExternalIdentityJpaEntity.Provider provider,
            String externalSubject
    );

    boolean existsByUserIdAndProvider(
            UUID userId,
            UserExternalIdentityJpaEntity.Provider provider
    );
}
