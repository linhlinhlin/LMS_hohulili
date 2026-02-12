package com.example.lms.learning_delivery.domain.repository;

import com.example.lms.learning_delivery.domain.model.Achievement;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AchievementRepository {
    List<Achievement> findAll();
    Optional<Achievement> findById(UUID id);
    List<Achievement> findByCategory(String category);
}
