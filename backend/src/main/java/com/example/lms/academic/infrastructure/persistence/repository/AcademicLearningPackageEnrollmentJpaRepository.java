package com.example.lms.academic.infrastructure.persistence.repository;

import com.example.lms.academic.infrastructure.persistence.entity.AcademicLearningPackageEnrollmentJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AcademicLearningPackageEnrollmentJpaRepository extends JpaRepository<AcademicLearningPackageEnrollmentJpaEntity, UUID> {
    List<AcademicLearningPackageEnrollmentJpaEntity> findByOrganizationIdOrderByRequestedAtDesc(UUID organizationId);
    List<AcademicLearningPackageEnrollmentJpaEntity> findByOrganizationIdAndStatusOrderByRequestedAtDesc(UUID organizationId, String status);
    Optional<AcademicLearningPackageEnrollmentJpaEntity> findByIdAndOrganizationId(UUID id, UUID organizationId);
    Optional<AcademicLearningPackageEnrollmentJpaEntity> findFirstByOrganizationIdAndPackageIdAndStudentIdAndStatusInOrderByRequestedAtDesc(
            UUID organizationId,
            UUID packageId,
            UUID studentId,
            List<String> statuses);
}
