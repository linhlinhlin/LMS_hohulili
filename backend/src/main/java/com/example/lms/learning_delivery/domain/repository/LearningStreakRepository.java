package com.example.lms.learning_delivery.domain.repository;

import com.example.lms.learning_delivery.domain.model.LearningStreak;

import java.util.Optional;
import java.util.UUID;

public interface LearningStreakRepository {
    LearningStreak save(LearningStreak streak);
    Optional<LearningStreak> findByStudentId(UUID studentId);
}
