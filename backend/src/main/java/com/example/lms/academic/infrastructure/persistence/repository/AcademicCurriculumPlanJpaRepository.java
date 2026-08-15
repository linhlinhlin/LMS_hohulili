package com.example.lms.academic.infrastructure.persistence.repository;

import com.example.lms.academic.infrastructure.persistence.entity.AcademicCurriculumPlanJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AcademicCurriculumPlanJpaRepository extends JpaRepository<AcademicCurriculumPlanJpaEntity, UUID> {
    List<AcademicCurriculumPlanJpaEntity> findByOrganizationIdOrderByNameAsc(UUID organizationId);
    Optional<AcademicCurriculumPlanJpaEntity> findByIdAndOrganizationId(UUID id, UUID organizationId);
    boolean existsByOrganizationIdAndCodeIgnoreCase(UUID organizationId, String code);
}
