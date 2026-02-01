package com.example.lms.assessment.infrastructure.persistence;

import com.example.lms.assessment.domain.model.Question;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.assessment.infrastructure.persistence.entity.QuestionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuestionOptionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.QuestionJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

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
    public Optional<Question> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toDomain);
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
                .correctOption(domain.getCorrectOption())
                .createdBy(domain.getCreatedBy())
                .courseId(domain.getCourseId())
                .packageId(domain.getPackageId())
                .usageCount(domain.getUsageCount())
                .correctRate(domain.getCorrectRate())
                .build();
        
        if (domain.getOptions() != null) {
            List<QuestionOptionJpaEntity> optionEntities = domain.getOptions().stream()
                    .map(o -> QuestionOptionJpaEntity.builder()
                            .id(o.getId())
                            .question(entity)
                            .key(o.getKey())
                            .contentBlocks(o.getContentBlocks())
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
                .correctOption(entity.getCorrectOption())
                .createdBy(entity.getCreatedBy())
                .courseId(entity.getCourseId())
                .packageId(entity.getPackageId())
                .usageCount(entity.getUsageCount())
                .correctRate(entity.getCorrectRate())
                .options(options)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
