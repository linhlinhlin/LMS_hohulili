package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.QuestionJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface QuestionJpaRepository extends JpaRepository<QuestionJpaEntity, UUID> {
    java.util.List<QuestionJpaEntity> findByPackageId(UUID packageId);
    java.util.List<QuestionJpaEntity> findByPackageIdIn(java.util.List<UUID> packageIds);
    java.util.List<QuestionJpaEntity> findAllByCreatedBy(UUID createdBy);
}
