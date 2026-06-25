package com.example.lms.academic.infrastructure.persistence.repository;

import com.example.lms.academic.infrastructure.persistence.entity.AcademicProgramJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AcademicProgramJpaRepository extends JpaRepository<AcademicProgramJpaEntity, UUID> {
    List<AcademicProgramJpaEntity> findByOrganizationIdOrderByNameAsc(UUID organizationId);
    Optional<AcademicProgramJpaEntity> findByIdAndOrganizationId(UUID id, UUID organizationId);
    boolean existsByOrganizationIdAndCodeIgnoreCase(UUID organizationId, String code);
}
