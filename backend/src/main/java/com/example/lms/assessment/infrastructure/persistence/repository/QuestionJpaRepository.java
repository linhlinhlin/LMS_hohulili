package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.QuestionJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface QuestionJpaRepository extends JpaRepository<QuestionJpaEntity, UUID> {
    java.util.List<QuestionJpaEntity> findByPackageId(UUID packageId);
    java.util.List<QuestionJpaEntity> findByPackageIdIn(java.util.List<UUID> packageIds);
    java.util.List<QuestionJpaEntity> findAllByCreatedBy(UUID createdBy);
    java.util.List<QuestionJpaEntity> findByPackageIdAndCategoryId(UUID packageId, UUID categoryId);
    long countByPackageId(UUID packageId);
    long countByCategoryId(UUID categoryId);

    @Query(value = "SELECT * FROM questions WHERE package_id = :bankId ORDER BY RANDOM() LIMIT :count",
           nativeQuery = true)
    java.util.List<QuestionJpaEntity> findRandomByBankId(@Param("bankId") UUID bankId, @Param("count") int count);

    java.util.List<QuestionJpaEntity> findByPackageIdAndDifficulty(UUID packageId, String difficulty);
}
