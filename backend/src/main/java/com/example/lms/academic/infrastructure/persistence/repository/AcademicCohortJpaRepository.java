package com.example.lms.academic.infrastructure.persistence.repository;

import com.example.lms.academic.infrastructure.persistence.entity.AcademicCohortJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AcademicCohortJpaRepository extends JpaRepository<AcademicCohortJpaEntity, UUID> {
    List<AcademicCohortJpaEntity> findByOrganizationIdOrderByStartYearDescNameAsc(UUID organizationId);
    Optional<AcademicCohortJpaEntity> findByIdAndOrganizationId(UUID id, UUID organizationId);
    boolean existsByOrganizationIdAndCodeIgnoreCase(UUID organizationId, String code);
}
