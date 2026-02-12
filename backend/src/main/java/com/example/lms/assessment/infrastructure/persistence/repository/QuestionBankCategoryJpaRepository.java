package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.QuestionBankCategoryJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QuestionBankCategoryJpaRepository extends JpaRepository<QuestionBankCategoryJpaEntity, UUID> {
    List<QuestionBankCategoryJpaEntity> findByBankIdOrderBySortOrderAsc(UUID bankId);
    List<QuestionBankCategoryJpaEntity> findByBankIdAndParentIdIsNullOrderBySortOrderAsc(UUID bankId);
    List<QuestionBankCategoryJpaEntity> findByParentIdOrderBySortOrderAsc(UUID parentId);
}
