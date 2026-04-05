package com.example.lms.identity.infrastructure.persistence.mapper;

import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.domain.valueobject.UserId;
import org.springframework.stereotype.Component;

/**
 * Mapper for converting between User domain model and UserJpaEntity.
 * 
 * This mapper is part of the INFRASTRUCTURE layer and is responsible for
 * translating between the domain model (pure POJO) and the JPA entity.
 * 
 * Following the Repository Adapter pattern from Hexagonal Architecture.
 */
@Component
public class UserEntityMapper {

    /**
     * Convert JPA entity to domain model.
     * 
     * @param entity the JPA entity
     * @return the domain model, or null if entity is null
     */
    public User toDomain(UserJpaEntity entity) {
        if (entity == null) {
            return null;
        }

        return User.builder()
                .id(UserId.of(entity.getId()))
                .username(entity.getUsername())
                .email(Email.of(entity.getEmail()))
                .password(entity.getPassword())
                .fullName(entity.getFullName())
                .role(mapRoleToDomain(entity.getRole()))
                .enabled(entity.getEnabled() != null && entity.getEnabled())
                .organizationId(entity.getOrganizationId())
                .tokenExpiryDays(entity.getTokenExpiryDays())
                .avatarUrl(entity.getAvatarUrl())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    /**
     * Convert domain model to JPA entity.
     * 
     * @param domain the domain model
     * @return the JPA entity, or null if domain is null
     */
    public UserJpaEntity toEntity(User domain) {
        if (domain == null) {
            return null;
        }

        UserJpaEntity entity = new UserJpaEntity();
        entity.setId(domain.getId() != null ? domain.getId().value() : null);
        entity.setUsername(domain.getUsername());
        entity.setEmail(domain.getEmail() != null ? domain.getEmail().getValue() : null);
        entity.setPassword(domain.getPassword());
        entity.setFullName(domain.getFullName());
        entity.setRole(mapRoleToEntity(domain.getRole()));
        entity.setEnabled(domain.isEnabled());
        entity.setOrganizationId(domain.getOrganizationId());
        entity.setTokenExpiryDays(domain.getTokenExpiryDays());
        entity.setAvatarUrl(domain.getAvatarUrl());
        entity.setCreatedAt(domain.getCreatedAt());
        entity.setUpdatedAt(domain.getUpdatedAt());
        return entity;
    }

    /**
     * Map JPA role enum to domain role enum.
     */
    private Role mapRoleToDomain(UserJpaEntity.UserRole entityRole) {
        if (entityRole == null) {
            return Role.STUDENT;
        }
        return switch (entityRole) {
            case ADMIN -> Role.ADMIN;
            case ORG_ADMIN -> Role.ORG_ADMIN;
            case TEACHER -> Role.TEACHER;
            case STUDENT -> Role.STUDENT;
        };
    }

    /**
     * Map domain role enum to JPA role enum.
     */
    private UserJpaEntity.UserRole mapRoleToEntity(Role domainRole) {
        if (domainRole == null) {
            return UserJpaEntity.UserRole.STUDENT;
        }
        return switch (domainRole) {
            case ADMIN -> UserJpaEntity.UserRole.ADMIN;
            case ORG_ADMIN -> UserJpaEntity.UserRole.ORG_ADMIN;
            case TEACHER -> UserJpaEntity.UserRole.TEACHER;
            case STUDENT -> UserJpaEntity.UserRole.STUDENT;
        };
    }
}
