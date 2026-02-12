package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.domain.model.LearningStreak;
import com.example.lms.learning_delivery.domain.repository.LearningStreakRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningStreakJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.LearningStreakJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class LearningStreakRepositoryAdapter implements LearningStreakRepository {

    private final LearningStreakJpaRepository jpaRepository;

    @Override
    public LearningStreak save(LearningStreak streak) {
        LearningStreakJpaEntity entity = toEntity(streak);
        LearningStreakJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<LearningStreak> findByStudentId(UUID studentId) {
        return jpaRepository.findByStudentId(studentId).map(this::toDomain);
    }

    private LearningStreakJpaEntity toEntity(LearningStreak domain) {
        return LearningStreakJpaEntity.builder()
                .id(domain.getId())
                .studentId(domain.getStudentId())
                .currentStreak(domain.getCurrentStreak())
                .longestStreak(domain.getLongestStreak())
                .lastActivityDate(domain.getLastActivityDate())
                .streakFrozenUntil(domain.getStreakFrozenUntil())
                .updatedAt(domain.getUpdatedAt())
                .build();
    }

    private LearningStreak toDomain(LearningStreakJpaEntity entity) {
        return new LearningStreak(
                entity.getId(),
                entity.getStudentId(),
                entity.getCurrentStreak(),
                entity.getLongestStreak(),
                entity.getLastActivityDate(),
                entity.getStreakFrozenUntil(),
                entity.getUpdatedAt()
        );
    }
}
