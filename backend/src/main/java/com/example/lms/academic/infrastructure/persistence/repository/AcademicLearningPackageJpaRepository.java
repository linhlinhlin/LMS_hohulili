package com.example.lms.academic.infrastructure.persistence.repository;

import com.example.lms.academic.infrastructure.persistence.entity.AcademicLearningPackageJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AcademicLearningPackageJpaRepository extends JpaRepository<AcademicLearningPackageJpaEntity, UUID> {
    List<AcademicLearningPackageJpaEntity> findByOrganizationIdOrderByNameAsc(UUID organizationId);
    Optional<AcademicLearningPackageJpaEntity> findByIdAndOrganizationId(UUID id, UUID organizationId);
    boolean existsByOrganizationIdAndCodeIgnoreCase(UUID organizationId, String code);
}
