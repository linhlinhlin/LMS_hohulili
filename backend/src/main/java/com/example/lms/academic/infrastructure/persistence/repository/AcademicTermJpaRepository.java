package com.example.lms.academic.infrastructure.persistence.repository;

import com.example.lms.academic.infrastructure.persistence.entity.AcademicTermJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AcademicTermJpaRepository extends JpaRepository<AcademicTermJpaEntity, UUID> {
    List<AcademicTermJpaEntity> findByOrganizationIdOrderByAcademicYearAscTermNumberAsc(UUID organizationId);
    Optional<AcademicTermJpaEntity> findByIdAndOrganizationId(UUID id, UUID organizationId);
    boolean existsByOrganizationIdAndCodeIgnoreCase(UUID organizationId, String code);
}
