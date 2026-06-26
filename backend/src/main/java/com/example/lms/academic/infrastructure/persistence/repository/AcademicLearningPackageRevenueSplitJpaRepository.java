package com.example.lms.academic.infrastructure.persistence.repository;

import com.example.lms.academic.infrastructure.persistence.entity.AcademicLearningPackageRevenueSplitJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AcademicLearningPackageRevenueSplitJpaRepository
        extends JpaRepository<AcademicLearningPackageRevenueSplitJpaEntity, UUID> {

    boolean existsByOrganizationIdAndEnrollmentId(UUID organizationId, UUID enrollmentId);

    List<AcademicLearningPackageRevenueSplitJpaEntity>
    findByOrganizationIdAndEnrollmentIdOrderByCreatedAtAsc(UUID organizationId, UUID enrollmentId);
}
