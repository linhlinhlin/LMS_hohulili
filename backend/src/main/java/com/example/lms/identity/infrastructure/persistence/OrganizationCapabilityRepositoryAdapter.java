package com.example.lms.identity.infrastructure.persistence;

import com.example.lms.identity.domain.model.OrganizationCapability;
import com.example.lms.identity.domain.repository.OrganizationCapabilityRepository;
import com.example.lms.identity.infrastructure.persistence.entity.OrganizationCapabilityJpaEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OrganizationCapabilityRepositoryAdapter implements OrganizationCapabilityRepository {
    private final OrganizationCapabilityJpaRepository jpaRepository;

    @Override
    public List<OrganizationCapability> findByOrganizationId(UUID organizationId) {
        return jpaRepository.findByOrganizationId(organizationId).stream()
                .map(this::toDomain)
                .toList();
    }

    @Override
    public Optional<OrganizationCapability> findByOrganizationIdAndKey(UUID organizationId, String key) {
        return jpaRepository.findByOrganizationIdAndKey(organizationId, key).map(this::toDomain);
    }

    @Override
    public OrganizationCapability save(OrganizationCapability capability) {
        return toDomain(jpaRepository.save(toEntity(capability)));
    }

    private OrganizationCapability toDomain(OrganizationCapabilityJpaEntity entity) {
        return new OrganizationCapability(
            entity.getId(),
            entity.getOrganizationId(),
            entity.getKey(),
            entity.getEnabled() != null && entity.getEnabled(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private OrganizationCapabilityJpaEntity toEntity(OrganizationCapability capability) {
        OrganizationCapabilityJpaEntity entity = new OrganizationCapabilityJpaEntity();
        entity.setId(capability.getId());
        entity.setOrganizationId(capability.getOrganizationId());
        entity.setKey(capability.getKey());
        entity.setEnabled(capability.isEnabled());
        entity.setCreatedAt(capability.getCreatedAt());
        entity.setUpdatedAt(capability.getUpdatedAt());
        return entity;
    }
}
