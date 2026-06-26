package com.example.lms.academic.infrastructure.persistence.repository;

import com.example.lms.academic.infrastructure.persistence.entity.AcademicLearningPackageClassTargetJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AcademicLearningPackageClassTargetJpaRepository
        extends JpaRepository<AcademicLearningPackageClassTargetJpaEntity, UUID> {
    List<AcademicLearningPackageClassTargetJpaEntity> findByOrganizationIdOrderByCreatedAtAsc(UUID organizationId);
    boolean existsByOrganizationIdAndPackageIdAndCourseId(UUID organizationId, UUID packageId, UUID courseId);
}
