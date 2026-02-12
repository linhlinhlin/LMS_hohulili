package com.example.lms.learning_delivery.domain.model;

import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;

/**
 * Learning Streak Domain Model.
 * Tracks daily learning streaks (Duolingo pattern).
 */
public class LearningStreak {

    private UUID id;
    private UUID studentId;
    private int currentStreak;
    private int longestStreak;
    private LocalDate lastActivityDate;
    private LocalDate streakFrozenUntil;
    private Instant updatedAt;

    public LearningStreak(UUID id, UUID studentId, int currentStreak, int longestStreak,
                          LocalDate lastActivityDate, LocalDate streakFrozenUntil, Instant updatedAt) {
        this.id = id;
        this.studentId = studentId;
        this.currentStreak = currentStreak;
        this.longestStreak = longestStreak;
        this.lastActivityDate = lastActivityDate;
        this.streakFrozenUntil = streakFrozenUntil;
        this.updatedAt = updatedAt;
    }

    public static LearningStreak create(UUID studentId) {
        return new LearningStreak(UUID.randomUUID(), studentId, 0, 0, null, null, Instant.now());
    }

    public void recordActivity(LocalDate today) {
        if (lastActivityDate == null) {
            currentStreak = 1;
        } else if (lastActivityDate.equals(today)) {
            // Already recorded today
            return;
        } else if (lastActivityDate.equals(today.minusDays(1))) {
            currentStreak++;
        } else if (streakFrozenUntil != null && !today.isAfter(streakFrozenUntil)) {
            // Streak is frozen - continue
            currentStreak++;
        } else {
            // Streak broken
            currentStreak = 1;
        }
        lastActivityDate = today;
        if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
        }
        updatedAt = Instant.now();
    }

    public void freezeStreak(int days) {
        if (lastActivityDate != null) {
            streakFrozenUntil = lastActivityDate.plusDays(days);
            updatedAt = Instant.now();
        }
    }

    // Getters
    public UUID getId() { return id; }
    public UUID getStudentId() { return studentId; }
    public int getCurrentStreak() { return currentStreak; }
    public int getLongestStreak() { return longestStreak; }
    public LocalDate getLastActivityDate() { return lastActivityDate; }
    public LocalDate getStreakFrozenUntil() { return streakFrozenUntil; }
    public Instant getUpdatedAt() { return updatedAt; }
}
