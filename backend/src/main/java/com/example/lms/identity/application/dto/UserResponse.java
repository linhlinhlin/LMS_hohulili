package com.example.lms.identity.application.dto;

import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;

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
    boolean enabled
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
            user.isEnabled()
        );
    }

    /**
     * Create from JPA entity.
     */
    public static UserResponse from(UserJpaEntity entity) {
        return new UserResponse(
            entity.getId(),
            entity.getUsername(),
            entity.getEmail(),
            entity.getFullName(),
            entity.getRole() != null ? entity.getRole().name() : null,
            entity.isEnabled()
        );
    }
}
