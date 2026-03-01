package com.example.lms.identity.infrastructure.persistence.mapper;

import com.example.lms.identity.domain.model.Organization;
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
        entity.setCreatedAt(domain.getCreatedAt());
        entity.setUpdatedAt(domain.getUpdatedAt());
        return entity;
    }
}
