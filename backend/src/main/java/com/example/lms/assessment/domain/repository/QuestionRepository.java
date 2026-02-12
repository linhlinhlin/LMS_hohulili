package com.example.lms.assessment.domain.repository;

import com.example.lms.assessment.domain.model.Question;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuestionRepository {
    Question save(Question question);
    List<Question> saveAll(List<Question> questions);
    Optional<Question> findById(UUID id);
    List<Question> findAllByIds(List<UUID> ids);
    List<Question> findByBankId(UUID bankId);
    List<Question> findByBankIdAndCategoryId(UUID bankId, UUID categoryId);
    List<Question> findAllByCreatedBy(UUID createdBy);
    long countByBankId(UUID bankId);
    long countByCategoryId(UUID categoryId);
    void deleteById(UUID id);
}
