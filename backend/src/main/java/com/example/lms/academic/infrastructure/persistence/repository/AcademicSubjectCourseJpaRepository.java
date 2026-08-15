package com.example.lms.academic.infrastructure.persistence.repository;

import com.example.lms.academic.infrastructure.persistence.entity.AcademicSubjectCourseJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AcademicSubjectCourseJpaRepository extends JpaRepository<AcademicSubjectCourseJpaEntity, UUID> {
    List<AcademicSubjectCourseJpaEntity> findByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);
    boolean existsByOrganizationIdAndSubjectIdAndCourseId(UUID organizationId, UUID subjectId, UUID courseId);
}
