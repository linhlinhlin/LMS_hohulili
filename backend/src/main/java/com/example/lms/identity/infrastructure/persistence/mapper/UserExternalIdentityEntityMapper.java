package com.example.lms.identity.infrastructure.persistence.mapper;

import com.example.lms.identity.domain.model.ExternalIdentityProvider;
import com.example.lms.identity.domain.model.UserExternalIdentity;
import com.example.lms.identity.infrastructure.persistence.entity.UserExternalIdentityJpaEntity;
import com.example.lms.shared.domain.valueobject.UserId;
import org.springframework.stereotype.Component;

@Component
public class UserExternalIdentityEntityMapper {

    public UserExternalIdentity toDomain(UserExternalIdentityJpaEntity entity) {
        if (entity == null) {
            return null;
        }

        return new UserExternalIdentity(
                entity.getId(),
                UserId.of(entity.getUserId()),
                mapProvider(entity.getProvider()),
                entity.getExternalSubject(),
                entity.getEmailAtLink(),
                entity.getEmailVerifiedAt(),
                entity.getLinkedAt(),
                entity.getLastLoginAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public UserExternalIdentityJpaEntity toEntity(UserExternalIdentity domain) {
        if (domain == null) {
            return null;
        }

        UserExternalIdentityJpaEntity entity = new UserExternalIdentityJpaEntity();
        entity.setId(domain.getId());
        entity.setUserId(domain.getUserId().value());
        entity.setProvider(mapProvider(domain.getProvider()));
        entity.setExternalSubject(domain.getExternalSubject());
        entity.setEmailAtLink(domain.getEmailAtLink());
        entity.setEmailVerifiedAt(domain.getEmailVerifiedAt());
        entity.setLinkedAt(domain.getLinkedAt());
        entity.setLastLoginAt(domain.getLastLoginAt());
        entity.setCreatedAt(domain.getCreatedAt());
        entity.setUpdatedAt(domain.getUpdatedAt());
        return entity;
    }

    private ExternalIdentityProvider mapProvider(UserExternalIdentityJpaEntity.Provider provider) {
        if (provider == null) {
            return null;
        }
        return switch (provider) {
            case GOOGLE -> ExternalIdentityProvider.GOOGLE;
        };
    }

    private UserExternalIdentityJpaEntity.Provider mapProvider(ExternalIdentityProvider provider) {
        if (provider == null) {
            return null;
        }
        return switch (provider) {
            case GOOGLE -> UserExternalIdentityJpaEntity.Provider.GOOGLE;
        };
    }
}
