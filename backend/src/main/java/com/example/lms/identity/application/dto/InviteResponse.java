package com.example.lms.identity.application.dto;

import com.example.lms.identity.domain.model.OrganizationInvite;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for invite data.
 */
public record InviteResponse(
    UUID id,
    UUID organizationId,
    String organizationName,
    String type,
    String code,
    String email,
    Integer maxUses,
    int useCount,
    String status,
    Instant expiresAt,
    Instant createdAt
) {
    public static InviteResponse from(OrganizationInvite invite, String orgName) {
        return new InviteResponse(
            invite.getId(),
            invite.getOrganizationId(),
            orgName,
            invite.getType().name(),
            invite.getCode(),
            invite.getEmail(),
            invite.getMaxUses(),
            invite.getUseCount(),
            invite.getStatus().name(),
            invite.getExpiresAt(),
            invite.getCreatedAt()
        );
    }
}
