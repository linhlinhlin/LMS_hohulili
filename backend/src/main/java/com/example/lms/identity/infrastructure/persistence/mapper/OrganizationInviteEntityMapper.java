package com.example.lms.identity.infrastructure.persistence.mapper;

import com.example.lms.identity.domain.model.OrganizationInvite;
import com.example.lms.identity.infrastructure.persistence.entity.OrganizationInviteJpaEntity;
import org.springframework.stereotype.Component;

@Component
public class OrganizationInviteEntityMapper {

    public OrganizationInvite toDomain(OrganizationInviteJpaEntity entity) {
        if (entity == null) return null;
        return new OrganizationInvite(
            entity.getId(),
            entity.getOrganizationId(),
            mapTypeToDomain(entity.getType()),
            entity.getCode(),
            entity.getEmail(),
            entity.getTokenHash(),
            entity.getMaxUses(),
            entity.getUseCount(),
            mapStatusToDomain(entity.getStatus()),
            entity.getExpiresAt(),
            entity.getCreatedBy(),
            entity.getCreatedAt(),
            entity.getVersion() // Audit fix: map version for optimistic locking
        );
    }

    public OrganizationInviteJpaEntity toEntity(OrganizationInvite domain) {
        if (domain == null) return null;
        OrganizationInviteJpaEntity entity = new OrganizationInviteJpaEntity();
        entity.setId(domain.getId());
        entity.setOrganizationId(domain.getOrganizationId());
        entity.setType(mapTypeToEntity(domain.getType()));
        entity.setCode(domain.getCode());
        entity.setEmail(domain.getEmail());
        entity.setTokenHash(domain.getTokenHash());
        entity.setMaxUses(domain.getMaxUses());
        entity.setUseCount(domain.getUseCount());
        entity.setStatus(mapStatusToEntity(domain.getStatus()));
        entity.setExpiresAt(domain.getExpiresAt());
        entity.setCreatedBy(domain.getCreatedBy());
        entity.setCreatedAt(domain.getCreatedAt());
        entity.setVersion(domain.getVersion()); // Audit fix: map version
        return entity;
    }

    private OrganizationInvite.InviteType mapTypeToDomain(OrganizationInviteJpaEntity.InviteType type) {
        return switch (type) {
            case CODE -> OrganizationInvite.InviteType.CODE;
            case EMAIL -> OrganizationInvite.InviteType.EMAIL;
        };
    }

    private OrganizationInviteJpaEntity.InviteType mapTypeToEntity(OrganizationInvite.InviteType type) {
        return switch (type) {
            case CODE -> OrganizationInviteJpaEntity.InviteType.CODE;
            case EMAIL -> OrganizationInviteJpaEntity.InviteType.EMAIL;
        };
    }

    private OrganizationInvite.InviteStatus mapStatusToDomain(OrganizationInviteJpaEntity.InviteStatus status) {
        return switch (status) {
            case ACTIVE -> OrganizationInvite.InviteStatus.ACTIVE;
            case REVOKED -> OrganizationInvite.InviteStatus.REVOKED;
            case EXPIRED -> OrganizationInvite.InviteStatus.EXPIRED;
        };
    }

    private OrganizationInviteJpaEntity.InviteStatus mapStatusToEntity(OrganizationInvite.InviteStatus status) {
        return switch (status) {
            case ACTIVE -> OrganizationInviteJpaEntity.InviteStatus.ACTIVE;
            case REVOKED -> OrganizationInviteJpaEntity.InviteStatus.REVOKED;
            case EXPIRED -> OrganizationInviteJpaEntity.InviteStatus.EXPIRED;
        };
    }
}
