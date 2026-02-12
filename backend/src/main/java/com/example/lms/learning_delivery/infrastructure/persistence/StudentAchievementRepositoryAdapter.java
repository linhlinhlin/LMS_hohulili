package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.domain.model.StudentAchievement;
import com.example.lms.learning_delivery.domain.repository.StudentAchievementRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.StudentAchievementJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.StudentAchievementJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class StudentAchievementRepositoryAdapter implements StudentAchievementRepository {

    private final StudentAchievementJpaRepository jpaRepository;

    @Override
    public StudentAchievement save(StudentAchievement domain) {
        StudentAchievementJpaEntity entity = StudentAchievementJpaEntity.builder()
                .id(domain.id())
                .studentId(domain.studentId())
                .achievementId(domain.achievementId())
                .build();
        StudentAchievementJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public List<StudentAchievement> findByStudentId(UUID studentId) {
        return jpaRepository.findByStudentId(studentId).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public boolean existsByStudentIdAndAchievementId(UUID studentId, UUID achievementId) {
        return jpaRepository.existsByStudentIdAndAchievementId(studentId, achievementId);
    }

    private StudentAchievement toDomain(StudentAchievementJpaEntity entity) {
        return new StudentAchievement(
                entity.getId(),
                entity.getStudentId(),
                entity.getAchievementId(),
                entity.getEarnedAt()
        );
    }
}
