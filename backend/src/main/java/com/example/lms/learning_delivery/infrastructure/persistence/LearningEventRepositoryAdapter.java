package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.domain.model.LearningEvent;
import com.example.lms.learning_delivery.domain.repository.LearningEventRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningEventJpaEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class LearningEventRepositoryAdapter implements LearningEventRepository {

    private final LearningEventJpaRepository jpaRepository;

    @Override
    public LearningEvent save(LearningEvent event) {
        LearningEventJpaEntity entity = new LearningEventJpaEntity();
        entity.setStudentId(event.getStudentId());
        entity.setLessonId(event.getLessonId());
        entity.setSectionId(event.getSectionId());
        entity.setEventType(event.getEventType().name());
        entity.setEventData(event.getEventData());
        entity.setCreatedAt(event.getCreatedAt() != null ? event.getCreatedAt() : Instant.now());

        LearningEventJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<LearningEvent> findLastActivityEvent(UUID studentId) {
        return jpaRepository.findLastActivityEvent(studentId)
                .map(this::toDomain);
    }

    @Override
    public long sumTimeSpentSince(UUID studentId, Instant since) {
        return jpaRepository.sumTimeSpentSince(studentId, since);
    }

    @Override
    public long countByStudentId(UUID studentId) {
        return jpaRepository.countByStudentId(studentId);
    }

    @Override
    public Long sumTimeSpentByStudentId(UUID studentId) {
        return jpaRepository.sumTimeSpentByStudentId(studentId);
    }

    private LearningEvent toDomain(LearningEventJpaEntity entity) {
        return LearningEvent.builder()
                .id(entity.getId())
                .studentId(entity.getStudentId())
                .lessonId(entity.getLessonId())
                .sectionId(entity.getSectionId())
                .eventType(LearningEvent.EventType.valueOf(entity.getEventType()))
                .eventData(entity.getEventData())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
