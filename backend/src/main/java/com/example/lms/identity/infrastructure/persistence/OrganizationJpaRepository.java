package com.example.lms.identity.infrastructure.persistence;

import com.example.lms.identity.infrastructure.persistence.entity.OrganizationJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationJpaRepository extends JpaRepository<OrganizationJpaEntity, UUID> {

    Optional<OrganizationJpaEntity> findByCode(String code);

    boolean existsByCode(String code);

    /** Count organizations with {@code enabled = true} (issue #200, F-ORG-1). */
    long countByEnabledTrue();

    /** Issue #231 (Phase 1): tìm default platform org. */
    Optional<OrganizationJpaEntity> findByIsDefaultTrue();
}
