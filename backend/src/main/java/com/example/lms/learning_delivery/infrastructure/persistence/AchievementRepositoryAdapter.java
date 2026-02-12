package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.domain.model.Achievement;
import com.example.lms.learning_delivery.domain.repository.AchievementRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.AchievementJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.AchievementJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class AchievementRepositoryAdapter implements AchievementRepository {

    private final AchievementJpaRepository jpaRepository;

    @Override
    public List<Achievement> findAll() {
        return jpaRepository.findAll().stream().map(this::toDomain).collect(Collectors.toList());
    }

    @Override
    public Optional<Achievement> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    @Override
    public List<Achievement> findByCategory(String category) {
        return jpaRepository.findByCategory(category).stream().map(this::toDomain).collect(Collectors.toList());
    }

    private Achievement toDomain(AchievementJpaEntity entity) {
        return new Achievement(
                entity.getId(),
                entity.getCode(),
                entity.getName(),
                entity.getDescription(),
                entity.getIcon(),
                entity.getCategory(),
                entity.getThreshold()
        );
    }
}
