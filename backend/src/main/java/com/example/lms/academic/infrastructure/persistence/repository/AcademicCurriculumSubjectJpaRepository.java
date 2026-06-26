package com.example.lms.academic.infrastructure.persistence.repository;

import com.example.lms.academic.infrastructure.persistence.entity.AcademicCurriculumSubjectJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AcademicCurriculumSubjectJpaRepository extends JpaRepository<AcademicCurriculumSubjectJpaEntity, UUID> {
    List<AcademicCurriculumSubjectJpaEntity> findByOrganizationIdOrderByDisplayOrderAscCreatedAtAsc(UUID organizationId);
    boolean existsByOrganizationIdAndCurriculumPlanIdAndSubjectId(UUID organizationId, UUID curriculumPlanId, UUID subjectId);
}
