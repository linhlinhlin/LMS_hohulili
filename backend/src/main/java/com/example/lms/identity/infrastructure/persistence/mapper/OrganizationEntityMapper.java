package com.example.lms.identity.infrastructure.persistence.mapper;

import com.example.lms.identity.domain.model.Organization;
import com.example.lms.identity.domain.model.OrganizationType;
import com.example.lms.identity.infrastructure.persistence.entity.OrganizationJpaEntity;
import org.springframework.stereotype.Component;

@Component
public class OrganizationEntityMapper {

    public Organization toDomain(OrganizationJpaEntity entity) {
        if (entity == null) return null;
        return new Organization(
            entity.getId(),
            entity.getName(),
            entity.getCode(),
            entity.getDescription(),
            entity.getEnabled() != null && entity.getEnabled(),
            entity.getTokenExpiryDays() != null ? entity.getTokenExpiryDays() : 30,
            parseType(entity.getType()),
            entity.getIsDefault() != null && entity.getIsDefault(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    public OrganizationJpaEntity toEntity(Organization domain) {
        if (domain == null) return null;
        OrganizationJpaEntity entity = new OrganizationJpaEntity();
        entity.setId(domain.getId());
        entity.setName(domain.getName());
        entity.setCode(domain.getCode());
        entity.setDescription(domain.getDescription());
        entity.setEnabled(domain.isEnabled());
        entity.setTokenExpiryDays(domain.getTokenExpiryDays());
        entity.setType(domain.getType() != null ? domain.getType().name() : OrganizationType.PARTNER.name());
        entity.setIsDefault(domain.isDefault());
        entity.setCreatedAt(domain.getCreatedAt());
        entity.setUpdatedAt(domain.getUpdatedAt());
        return entity;
    }

    /** Issue #231: tolerant parse — bad data fallback PARTNER thay vì throw. */
    private OrganizationType parseType(String raw) {
        if (raw == null || raw.isBlank()) return OrganizationType.PARTNER;
        try {
            return OrganizationType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return OrganizationType.PARTNER;
        }
    }
}
