package com.example.lms.academic.infrastructure.persistence.repository;

import com.example.lms.academic.infrastructure.persistence.entity.AcademicLearningPackagePaymentEventJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AcademicLearningPackagePaymentEventJpaRepository
        extends JpaRepository<AcademicLearningPackagePaymentEventJpaEntity, UUID> {

    List<AcademicLearningPackagePaymentEventJpaEntity>
    findByOrganizationIdAndEnrollmentIdOrderByOccurredAtAscCreatedAtAsc(UUID organizationId, UUID enrollmentId);
}
