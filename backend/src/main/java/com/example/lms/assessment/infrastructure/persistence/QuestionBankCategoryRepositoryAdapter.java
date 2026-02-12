package com.example.lms.assessment.infrastructure.persistence;

import com.example.lms.assessment.domain.model.QuestionBankCategory;
import com.example.lms.assessment.domain.repository.QuestionBankCategoryRepository;
import com.example.lms.assessment.infrastructure.persistence.entity.QuestionBankCategoryJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.QuestionBankCategoryJpaRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Adapter: maps QuestionBankCategoryJpaEntity ↔ QuestionBankCategory domain.
 */
@Component
public class QuestionBankCategoryRepositoryAdapter implements QuestionBankCategoryRepository {

    private final QuestionBankCategoryJpaRepository jpaRepository;

    public QuestionBankCategoryRepositoryAdapter(QuestionBankCategoryJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public QuestionBankCategory save(QuestionBankCategory category) {
        QuestionBankCategoryJpaEntity entity = toEntity(category);
        QuestionBankCategoryJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<QuestionBankCategory> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    @Override
    public List<QuestionBankCategory> findByBankId(UUID bankId) {
        return jpaRepository.findByBankIdOrderBySortOrderAsc(bankId).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<QuestionBankCategory> findRootCategoriesByBankId(UUID bankId) {
        return jpaRepository.findByBankIdAndParentIdIsNullOrderBySortOrderAsc(bankId).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<QuestionBankCategory> findChildrenByParentId(UUID parentId) {
        return jpaRepository.findByParentIdOrderBySortOrderAsc(parentId).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    // ============ Mappers ============

    private QuestionBankCategoryJpaEntity toEntity(QuestionBankCategory domain) {
        return QuestionBankCategoryJpaEntity.builder()
                .id(domain.getId())
                .bankId(domain.getBankId())
                .parentId(domain.getParentId())
                .name(domain.getName())
                .description(domain.getDescription())
                .sortOrder(domain.getSortOrder())
                .questionCount(domain.getQuestionCount())
                .build();
    }

    private QuestionBankCategory toDomain(QuestionBankCategoryJpaEntity entity) {
        return new QuestionBankCategory(
                entity.getId(),
                entity.getBankId(),
                entity.getParentId(),
                entity.getName(),
                entity.getDescription(),
                entity.getSortOrder() != null ? entity.getSortOrder() : 0,
                entity.getQuestionCount() != null ? entity.getQuestionCount() : 0,
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
