package com.example.lms.identity.application.dto;

import com.example.lms.identity.domain.model.User;

import java.util.UUID;

/**
 * Response DTO for user data.
 */
public record UserResponse(
    UUID id,
    String username,
    String email,
    String fullName,
    String role,
    boolean enabled,
    UUID organizationId,
    String avatarUrl,
    boolean mustChangePassword
) {
    /**
     * Create from domain User model.
     */
    public static UserResponse fromDomain(User user) {
        return new UserResponse(
            user.getId().value(),
            user.getUsername(),
            user.getEmail() != null ? user.getEmail().getValue() : null,
            user.getFullName(),
            user.getRole().name(),
            user.isEnabled(),
            user.getOrganizationId(),
            user.getAvatarUrl(),
            user.isMustChangePassword()
        );
    }
}
