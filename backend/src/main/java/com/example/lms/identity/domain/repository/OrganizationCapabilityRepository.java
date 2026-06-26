package com.example.lms.identity.domain.repository;

import com.example.lms.identity.domain.model.OrganizationCapability;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationCapabilityRepository {
    List<OrganizationCapability> findByOrganizationId(UUID organizationId);

    Optional<OrganizationCapability> findByOrganizationIdAndKey(UUID organizationId, String key);

    OrganizationCapability save(OrganizationCapability capability);
}
