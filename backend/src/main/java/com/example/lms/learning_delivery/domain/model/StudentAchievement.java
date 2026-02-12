package com.example.lms.learning_delivery.domain.model;

import java.time.Instant;
import java.util.UUID;

public record StudentAchievement(
    UUID id,
    UUID studentId,
    UUID achievementId,
    Instant earnedAt
) {
    public static StudentAchievement create(UUID studentId, UUID achievementId) {
        return new StudentAchievement(UUID.randomUUID(), studentId, achievementId, Instant.now());
    }
}
