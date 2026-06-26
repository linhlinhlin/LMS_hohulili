package com.example.lms.academic.infrastructure.persistence.repository;

import com.example.lms.academic.infrastructure.persistence.entity.AcademicLearningPackageClassTargetJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface AcademicLearningPackageClassTargetJpaRepository
        extends JpaRepository<AcademicLearningPackageClassTargetJpaEntity, UUID> {
    List<AcademicLearningPackageClassTargetJpaEntity> findByOrganizationIdOrderByCreatedAtAsc(UUID organizationId);

    @Query("""
            SELECT COUNT(t) > 0
            FROM AcademicLearningPackageClassTargetJpaEntity t
            WHERE t.organizationId = :organizationId
              AND t.packageId = :packageId
              AND t.courseId = :courseId
              AND (
                    (:classGroupId IS NULL AND t.classGroupId IS NULL)
                    OR t.classGroupId = :classGroupId
              )
            """)
    boolean existsTarget(
            @Param("organizationId") UUID organizationId,
            @Param("packageId") UUID packageId,
            @Param("courseId") UUID courseId,
            @Param("classGroupId") UUID classGroupId);
}
