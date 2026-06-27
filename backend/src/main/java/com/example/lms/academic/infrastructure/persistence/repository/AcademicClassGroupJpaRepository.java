package com.example.lms.academic.infrastructure.persistence.repository;

import com.example.lms.academic.infrastructure.persistence.entity.AcademicClassGroupJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AcademicClassGroupJpaRepository extends JpaRepository<AcademicClassGroupJpaEntity, UUID> {
    List<AcademicClassGroupJpaEntity> findByOrganizationIdOrderByNameAsc(UUID organizationId);
    Optional<AcademicClassGroupJpaEntity> findByIdAndOrganizationId(UUID id, UUID organizationId);
    boolean existsByOrganizationIdAndCodeIgnoreCase(UUID organizationId, String code);
}
