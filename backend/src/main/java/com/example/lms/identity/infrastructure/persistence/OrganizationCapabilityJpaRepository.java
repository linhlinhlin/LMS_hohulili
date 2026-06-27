package com.example.lms.identity.infrastructure.persistence;

import com.example.lms.identity.infrastructure.persistence.entity.OrganizationCapabilityJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationCapabilityJpaRepository extends JpaRepository<OrganizationCapabilityJpaEntity, UUID> {
    List<OrganizationCapabilityJpaEntity> findByOrganizationId(UUID organizationId);

    Optional<OrganizationCapabilityJpaEntity> findByOrganizationIdAndKey(UUID organizationId, String key);
}
