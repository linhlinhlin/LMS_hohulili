package com.example.lms.learning_delivery.domain.repository;

import com.example.lms.learning_delivery.domain.model.LearningEvent;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface LearningEventRepository {
    LearningEvent save(LearningEvent event);

    Optional<LearningEvent> findLastActivityEvent(UUID studentId);

    long sumTimeSpentSince(UUID studentId, Instant since);

    long countByStudentId(UUID studentId);

    Long sumTimeSpentByStudentId(UUID studentId);
}
