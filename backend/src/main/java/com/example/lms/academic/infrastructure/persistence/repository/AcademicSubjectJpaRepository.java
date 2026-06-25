package com.example.lms.academic.infrastructure.persistence.repository;

import com.example.lms.academic.infrastructure.persistence.entity.AcademicSubjectJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AcademicSubjectJpaRepository extends JpaRepository<AcademicSubjectJpaEntity, UUID> {
    List<AcademicSubjectJpaEntity> findByOrganizationIdOrderByNameAsc(UUID organizationId);
    Optional<AcademicSubjectJpaEntity> findByIdAndOrganizationId(UUID id, UUID organizationId);
    boolean existsByOrganizationIdAndCodeIgnoreCase(UUID organizationId, String code);
}
