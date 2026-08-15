package com.example.lms.academic.infrastructure.persistence.repository;

import com.example.lms.academic.infrastructure.persistence.entity.AcademicLearningPackageItemJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AcademicLearningPackageItemJpaRepository extends JpaRepository<AcademicLearningPackageItemJpaEntity, UUID> {
    List<AcademicLearningPackageItemJpaEntity> findByOrganizationIdOrderByDisplayOrderAscCreatedAtAsc(UUID organizationId);
    boolean existsByOrganizationIdAndPackageIdAndSubjectId(UUID organizationId, UUID packageId, UUID subjectId);
    boolean existsByOrganizationIdAndPackageIdAndCourseId(UUID organizationId, UUID packageId, UUID courseId);
}
