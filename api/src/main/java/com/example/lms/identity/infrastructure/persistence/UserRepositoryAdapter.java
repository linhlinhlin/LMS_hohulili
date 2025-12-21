package com.example.lms.identity.infrastructure.persistence;

import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.mapper.UserEntityMapper;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.domain.valueobject.UserId;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Adapter implementation of UserRepository.
 * 
 * This is the ADAPTER in Hexagonal Architecture terminology.
 * It implements the domain port (UserRepository) using infrastructure
 * components (JPA repository and entity mapper).
 * 
 * This class is responsible for:
 * 1. Receiving domain model objects from use cases
 * 2. Converting to JPA entities using mapper
 * 3. Persisting using JPA repository
 * 4. Converting back to domain models
 */
@Repository("newUserRepositoryAdapter")
@RequiredArgsConstructor
public class UserRepositoryAdapter implements UserRepository {

    private final UserJpaRepository jpaRepository;
    private final UserEntityMapper mapper;

    @Override
    public User save(User user) {
        UserJpaEntity entity = mapper.toEntity(user);
        UserJpaEntity savedEntity = jpaRepository.save(entity);
        return mapper.toDomain(savedEntity);
    }

    @Override
    public Optional<User> findById(UserId id) {
        if (id == null || id.value() == null) {
            return Optional.empty();
        }
        return jpaRepository.findById(id.value())
                .map(mapper::toDomain);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return jpaRepository.findByEmail(email)
                .map(mapper::toDomain);
    }

    @Override
    public Optional<User> findByUsername(String username) {
        return jpaRepository.findByUsername(username)
                .map(mapper::toDomain);
    }

    @Override
    public boolean existsByEmail(String email) {
        return jpaRepository.existsByEmail(email);
    }

    @Override
    public boolean existsByUsername(String username) {
        return jpaRepository.existsByUsername(username);
    }

    @Override
    public List<User> findByRole(Role role) {
        UserJpaEntity.UserRole jpaRole = mapRoleToJpa(role);
        return jpaRepository.findByRole(jpaRole).stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public long countByRole(Role role) {
        UserJpaEntity.UserRole jpaRole = mapRoleToJpa(role);
        return jpaRepository.countByRole(jpaRole);
    }

    /**
     * Map domain Role to JPA UserRole.
     */
    private UserJpaEntity.UserRole mapRoleToJpa(Role role) {
        if (role == null) {
            return UserJpaEntity.UserRole.STUDENT;
        }
        return switch (role) {
            case ADMIN -> UserJpaEntity.UserRole.ADMIN;
            case TEACHER -> UserJpaEntity.UserRole.TEACHER;
            case STUDENT -> UserJpaEntity.UserRole.STUDENT;
        };
    }
}
