package com.example.lms.identity.application.dto;

import com.example.lms.identity.domain.model.Organization;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for organization data.
 */
public record OrganizationResponse(
    UUID id,
    String name,
    String code,
    String description,
    boolean enabled,
    int tokenExpiryDays,
    Instant createdAt,
    Instant updatedAt
) {
    public static OrganizationResponse from(Organization org) {
        return new OrganizationResponse(
            org.getId(), org.getName(), org.getCode(), org.getDescription(),
            org.isEnabled(), org.getTokenExpiryDays(),
            org.getCreatedAt(), org.getUpdatedAt()
        );
    }
}
