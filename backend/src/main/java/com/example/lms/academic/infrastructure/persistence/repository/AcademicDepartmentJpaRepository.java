package com.example.lms.academic.infrastructure.persistence.repository;

import com.example.lms.academic.infrastructure.persistence.entity.AcademicDepartmentJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AcademicDepartmentJpaRepository extends JpaRepository<AcademicDepartmentJpaEntity, UUID> {
    List<AcademicDepartmentJpaEntity> findByOrganizationIdOrderByNameAsc(UUID organizationId);
    Optional<AcademicDepartmentJpaEntity> findByIdAndOrganizationId(UUID id, UUID organizationId);
    boolean existsByOrganizationIdAndCodeIgnoreCase(UUID organizationId, String code);
}
