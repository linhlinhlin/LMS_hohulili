package com.example.lms.assessment.domain.repository;

import com.example.lms.assessment.domain.model.QuestionBank;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain repository port for QuestionBank aggregate.
 */
public interface QuestionBankRepository {
    QuestionBank save(QuestionBank bank);
    Optional<QuestionBank> findById(UUID id);
    List<QuestionBank> findByOwnerId(UUID ownerId);
    List<QuestionBank> findByVisibility(QuestionBank.Visibility visibility);
    List<QuestionBank> searchByName(String query);
    void deleteById(UUID id);
}
