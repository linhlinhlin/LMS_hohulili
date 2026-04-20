package com.example.lms.identity.infrastructure.persistence;

import com.example.lms.identity.domain.model.ExternalIdentityProvider;
import com.example.lms.identity.domain.model.UserExternalIdentity;
import com.example.lms.identity.domain.repository.ExternalIdentityRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserExternalIdentityJpaEntity;
import com.example.lms.identity.infrastructure.persistence.mapper.UserExternalIdentityEntityMapper;
import com.example.lms.identity.infrastructure.persistence.repository.UserExternalIdentityJpaRepository;
import com.example.lms.shared.domain.valueobject.UserId;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class UserExternalIdentityRepositoryAdapter implements ExternalIdentityRepository {

    private final UserExternalIdentityJpaRepository jpaRepository;
    private final UserExternalIdentityEntityMapper mapper;

    @Override
    public Optional<UserExternalIdentity> findByProviderAndExternalSubject(
            ExternalIdentityProvider provider,
            String externalSubject
    ) {
        return jpaRepository.findByProviderAndExternalSubject(mapProvider(provider), externalSubject)
                .map(mapper::toDomain);
    }

    @Override
    public boolean existsByUserIdAndProvider(UserId userId, ExternalIdentityProvider provider) {
        if (userId == null || userId.value() == null) {
            return false;
        }
        return jpaRepository.existsByUserIdAndProvider(userId.value(), mapProvider(provider));
    }

    @Override
    public UserExternalIdentity save(UserExternalIdentity identity) {
        return mapper.toDomain(jpaRepository.save(mapper.toEntity(identity)));
    }

    private UserExternalIdentityJpaEntity.Provider mapProvider(ExternalIdentityProvider provider) {
        return switch (provider) {
            case GOOGLE -> UserExternalIdentityJpaEntity.Provider.GOOGLE;
        };
    }
}
