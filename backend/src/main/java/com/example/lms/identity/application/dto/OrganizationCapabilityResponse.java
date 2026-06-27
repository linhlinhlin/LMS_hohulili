package com.example.lms.identity.application.dto;

import com.example.lms.identity.domain.model.OrganizationCapability;

import java.time.Instant;
import java.util.UUID;

public record OrganizationCapabilityResponse(
    UUID id,
    UUID organizationId,
    String key,
    boolean enabled,
    Instant createdAt,
    Instant updatedAt
) {
    public static OrganizationCapabilityResponse from(OrganizationCapability capability) {
        return new OrganizationCapabilityResponse(
            capability.getId(),
            capability.getOrganizationId(),
            capability.getKey(),
            capability.isEnabled(),
            capability.getCreatedAt(),
            capability.getUpdatedAt()
        );
    }
}
