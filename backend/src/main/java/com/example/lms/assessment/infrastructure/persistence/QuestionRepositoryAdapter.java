package com.example.lms.assessment.infrastructure.persistence;

import com.example.lms.assessment.domain.model.Question;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.assessment.infrastructure.persistence.entity.QuestionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuestionOptionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.QuestionJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class QuestionRepositoryAdapter implements QuestionRepository {

    public QuestionRepositoryAdapter(QuestionJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    private final QuestionJpaRepository jpaRepository;

    @Override
    public Question save(Question question) {
        QuestionJpaEntity entity = toEntity(question);
        QuestionJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public List<Question> saveAll(List<Question> questions) {
        List<QuestionJpaEntity> entities = questions.stream()
                .map(this::toEntity)
                .collect(Collectors.toList());
        return jpaRepository.saveAll(entities).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<Question> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    @Override
    public List<Question> findAllByIds(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) return new ArrayList<>();
        return jpaRepository.findAllById(ids).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<Question> findByBankId(UUID bankId) {
        return jpaRepository.findByPackageId(bankId).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<Question> findByBankIdAndCategoryId(UUID bankId, UUID categoryId) {
        return jpaRepository.findByPackageIdAndCategoryId(bankId, categoryId).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<Question> findAllByCreatedBy(UUID createdBy) {
        return jpaRepository.findAllByCreatedBy(createdBy).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public long countByBankId(UUID bankId) {
        return jpaRepository.countByPackageId(bankId);
    }

    @Override
    public long countByCategoryId(UUID categoryId) {
        return jpaRepository.countByCategoryId(categoryId);
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    // ============ Mapper ============

    private QuestionJpaEntity toEntity(Question domain) {
        QuestionJpaEntity entity = QuestionJpaEntity.builder()
                .id(domain.getId())
                .contentBlocks(domain.getContentBlocks())
                .difficulty(QuestionJpaEntity.Difficulty.valueOf(domain.getDifficulty().name()))
                .tags(domain.getTags())
                .status(QuestionJpaEntity.Status.valueOf(domain.getStatus().name()))
                .questionType(QuestionJpaEntity.QuestionType.valueOf(domain.getQuestionType().name()))
                .correctOption(domain.getCorrectOption())
                .answerKey(domain.getAnswerKey())
                .createdBy(domain.getCreatedBy())
                .courseId(domain.getCourseId())
                .packageId(domain.getPackageId())
                .categoryId(domain.getCategoryId())
                .usageCount(domain.getUsageCount())
                .correctRate(domain.getCorrectRate())
                .build();
        
        if (domain.getOptions() != null) {
            // Derive isCorrect per option from correctOption (supports comma-separated for MULTIPLE_CHOICE)
            java.util.Set<String> correctKeys = new java.util.HashSet<>();
            if (domain.getCorrectOption() != null) {
                for (String k : domain.getCorrectOption().split(",")) {
                    correctKeys.add(k.trim());
                }
            }

            List<QuestionOptionJpaEntity> optionEntities = domain.getOptions().stream()
                    .map(o -> QuestionOptionJpaEntity.builder()
                            .id(o.getId())
                            .question(entity)
                            .key(o.getKey())
                            .contentBlocks(o.getContentBlocks())
                            .isCorrect(correctKeys.contains(o.getKey()))
                            .orderIndex(o.getOrderIndex())
                            .build())
                    .collect(Collectors.toList());
            entity.setOptions(optionEntities);
        }

        return entity;
    }

    private Question toDomain(QuestionJpaEntity entity) {
        List<Question.QuestionOption> options = entity.getOptions() != null
                ? entity.getOptions().stream()
                    .map(o -> Question.QuestionOption.builder()
                            .id(o.getId())
                            .key(o.getKey())
                            .contentBlocks(o.getContentBlocks())
                            .orderIndex(o.getOrderIndex())
                            .build())
                    .collect(Collectors.toList())
                : null;
        
        return Question.builder()
                .id(entity.getId())
                .contentBlocks(entity.getContentBlocks())
                .difficulty(Question.Difficulty.valueOf(entity.getDifficulty().name()))
                .tags(entity.getTags())
                .status(Question.Status.valueOf(entity.getStatus().name()))
                .questionType(entity.getQuestionType() != null ? Question.QuestionType.valueOf(entity.getQuestionType().name()) : Question.QuestionType.SINGLE_CHOICE)
                .correctOption(entity.getCorrectOption())
                .answerKey(entity.getAnswerKey())
                .createdBy(entity.getCreatedBy())
                .courseId(entity.getCourseId())
                .packageId(entity.getPackageId())
                .categoryId(entity.getCategoryId())
                .usageCount(entity.getUsageCount())
                .correctRate(entity.getCorrectRate())
                .options(options)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
