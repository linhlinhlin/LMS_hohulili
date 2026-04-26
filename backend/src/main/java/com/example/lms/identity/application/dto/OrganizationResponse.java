package com.example.lms.identity.application.dto;

import com.example.lms.identity.domain.model.Organization;
import com.example.lms.identity.domain.model.OrganizationType;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for organization data.
 *
 * Issue #231 (Phase 1): expose `type` (PLATFORM/PARTNER/INTERNAL) +
 * `isDefault` flag để FE phân biệt org nền tảng vs đối tác.
 */
public record OrganizationResponse(
    UUID id,
    String name,
    String code,
    String description,
    boolean enabled,
    int tokenExpiryDays,
    OrganizationType type,
    boolean isDefault,
    Instant createdAt,
    Instant updatedAt
) {
    public static OrganizationResponse from(Organization org) {
        return new OrganizationResponse(
            org.getId(), org.getName(), org.getCode(), org.getDescription(),
            org.isEnabled(), org.getTokenExpiryDays(),
            org.getType(), org.isDefault(),
            org.getCreatedAt(), org.getUpdatedAt()
        );
    }
}
