package com.example.lms.assessment.domain.repository;

import com.example.lms.assessment.domain.model.QuestionBankCategory;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain repository port for QuestionBankCategory.
 */
public interface QuestionBankCategoryRepository {
    QuestionBankCategory save(QuestionBankCategory category);
    Optional<QuestionBankCategory> findById(UUID id);
    List<QuestionBankCategory> findByBankId(UUID bankId);
    List<QuestionBankCategory> findRootCategoriesByBankId(UUID bankId);
    List<QuestionBankCategory> findChildrenByParentId(UUID parentId);
    void deleteById(UUID id);
}
