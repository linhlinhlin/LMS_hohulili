package com.example.lms.identity.infrastructure.persistence.repository;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA Repository for UserJpaEntity.
 * 
 * This is an INFRASTRUCTURE component - should only be used by the adapter,
 * not directly by application or domain layers.
 */
@Repository
public interface UserJpaRepository extends JpaRepository<UserJpaEntity, UUID> {

    Optional<UserJpaEntity> findByUsername(String username);

    Optional<UserJpaEntity> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    List<UserJpaEntity> findByRole(UserJpaEntity.UserRole role);

    long countByRole(UserJpaEntity.UserRole role);

    List<UserJpaEntity> findByOrganizationId(UUID organizationId);

    @Query("SELECT u FROM UserJpaEntity u WHERE u.role = :role AND " +
           "(LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<UserJpaEntity> searchByRoleAndKeyword(
            @Param("role") UserJpaEntity.UserRole role,
            @Param("search") String search
    );

    // === PAGINATION SUPPORT (Added Dec 2025) ===

    /**
     * Find users by role with pagination - used by admin user list
     */
    @Query("SELECT u FROM UserJpaEntity u WHERE u.role = :role")
    Page<UserJpaEntity> findByRole(@Param("role") UserJpaEntity.UserRole role, Pageable pageable);

    @Query("SELECT u FROM UserJpaEntity u WHERE " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<UserJpaEntity> searchUsersByKeyword(
            @Param("search") String search,
            Pageable pageable
    );

    @Query("SELECT u FROM UserJpaEntity u WHERE u.role = :role AND " +
           "(LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<UserJpaEntity> searchUsersByRole(
            @Param("role") UserJpaEntity.UserRole role,
            @Param("search") String search,
            Pageable pageable
    );
}

