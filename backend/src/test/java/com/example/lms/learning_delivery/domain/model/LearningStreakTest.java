package com.example.lms.learning_delivery.domain.model;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class LearningStreakTest {

    @Test
    @DisplayName("create() sets initial values correctly")
    void createSetsInitialValues() {
        UUID studentId = UUID.randomUUID();

        LearningStreak streak = LearningStreak.create(studentId);

        assertThat(streak.getId()).isNotNull();
        assertThat(streak.getStudentId()).isEqualTo(studentId);
        assertThat(streak.getCurrentStreak()).isZero();
        assertThat(streak.getLongestStreak()).isZero();
        assertThat(streak.getLastActivityDate()).isNull();
        assertThat(streak.getStreakFrozenUntil()).isNull();
        assertThat(streak.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("recordActivity() from null lastActivityDate starts streak at 1")
    void recordActivityFromNullStartsAtOne() {
        LearningStreak streak = LearningStreak.create(UUID.randomUUID());
        LocalDate today = LocalDate.of(2026, 2, 8);

        streak.recordActivity(today);

        assertThat(streak.getCurrentStreak()).isEqualTo(1);
        assertThat(streak.getLastActivityDate()).isEqualTo(today);
    }

    @Test
    @DisplayName("recordActivity() same day does nothing")
    void recordActivitySameDayDoesNothing() {
        LocalDate today = LocalDate.of(2026, 2, 8);
        LearningStreak streak = new LearningStreak(
                UUID.randomUUID(), UUID.randomUUID(), 3, 5, today, null, Instant.now());
        Instant updatedBefore = streak.getUpdatedAt();

        streak.recordActivity(today);

        assertThat(streak.getCurrentStreak()).isEqualTo(3);
        assertThat(streak.getLongestStreak()).isEqualTo(5);
        assertThat(streak.getUpdatedAt()).isEqualTo(updatedBefore);
    }

    @Test
    @DisplayName("recordActivity() consecutive day increments streak")
    void recordActivityConsecutiveDayIncrements() {
        LocalDate yesterday = LocalDate.of(2026, 2, 7);
        LocalDate today = LocalDate.of(2026, 2, 8);
        LearningStreak streak = new LearningStreak(
                UUID.randomUUID(), UUID.randomUUID(), 3, 5, yesterday, null, Instant.now());

        streak.recordActivity(today);

        assertThat(streak.getCurrentStreak()).isEqualTo(4);
        assertThat(streak.getLastActivityDate()).isEqualTo(today);
    }

    @Test
    @DisplayName("recordActivity() with gap resets streak to 1")
    void recordActivityWithGapResetsToOne() {
        LocalDate threeDaysAgo = LocalDate.of(2026, 2, 5);
        LocalDate today = LocalDate.of(2026, 2, 8);
        LearningStreak streak = new LearningStreak(
                UUID.randomUUID(), UUID.randomUUID(), 7, 10, threeDaysAgo, null, Instant.now());

        streak.recordActivity(today);

        assertThat(streak.getCurrentStreak()).isEqualTo(1);
        assertThat(streak.getLastActivityDate()).isEqualTo(today);
    }

    @Test
    @DisplayName("recordActivity() updates longestStreak when current exceeds it")
    void recordActivityUpdatesLongestStreak() {
        LocalDate yesterday = LocalDate.of(2026, 2, 7);
        LocalDate today = LocalDate.of(2026, 2, 8);
        LearningStreak streak = new LearningStreak(
                UUID.randomUUID(), UUID.randomUUID(), 5, 5, yesterday, null, Instant.now());

        streak.recordActivity(today);

        assertThat(streak.getCurrentStreak()).isEqualTo(6);
        assertThat(streak.getLongestStreak()).isEqualTo(6);
    }

    @Test
    @DisplayName("recordActivity() with frozen streak continues even with gap")
    void recordActivityWithFrozenStreakContinues() {
        LocalDate lastActivity = LocalDate.of(2026, 2, 5);
        LocalDate frozenUntil = LocalDate.of(2026, 2, 10);
        LocalDate today = LocalDate.of(2026, 2, 8);
        LearningStreak streak = new LearningStreak(
                UUID.randomUUID(), UUID.randomUUID(), 4, 4, lastActivity, frozenUntil, Instant.now());

        streak.recordActivity(today);

        assertThat(streak.getCurrentStreak()).isEqualTo(5);
        assertThat(streak.getLastActivityDate()).isEqualTo(today);
    }

    @Test
    @DisplayName("freezeStreak() sets streakFrozenUntil to lastActivityDate plus days")
    void freezeStreakSetsCorrectDate() {
        LocalDate lastActivity = LocalDate.of(2026, 2, 8);
        LearningStreak streak = new LearningStreak(
                UUID.randomUUID(), UUID.randomUUID(), 3, 5, lastActivity, null, Instant.now());

        streak.freezeStreak(3);

        assertThat(streak.getStreakFrozenUntil()).isEqualTo(LocalDate.of(2026, 2, 11));
    }

    @Test
    @DisplayName("freezeStreak() does nothing when lastActivityDate is null")
    void freezeStreakDoesNothingWhenLastActivityNull() {
        LearningStreak streak = LearningStreak.create(UUID.randomUUID());
        Instant updatedBefore = streak.getUpdatedAt();

        streak.freezeStreak(5);

        assertThat(streak.getStreakFrozenUntil()).isNull();
        assertThat(streak.getUpdatedAt()).isEqualTo(updatedBefore);
    }

    @Test
    @DisplayName("recordActivity() multiple consecutive days tracks correctly")
    void recordActivityMultipleConsecutiveDaysTracksCorrectly() {
        LearningStreak streak = LearningStreak.create(UUID.randomUUID());

        LocalDate day1 = LocalDate.of(2026, 2, 1);
        LocalDate day2 = LocalDate.of(2026, 2, 2);
        LocalDate day3 = LocalDate.of(2026, 2, 3);
        LocalDate day4 = LocalDate.of(2026, 2, 4);
        LocalDate day5 = LocalDate.of(2026, 2, 5);

        streak.recordActivity(day1);
        assertThat(streak.getCurrentStreak()).isEqualTo(1);

        streak.recordActivity(day2);
        assertThat(streak.getCurrentStreak()).isEqualTo(2);

        streak.recordActivity(day3);
        assertThat(streak.getCurrentStreak()).isEqualTo(3);

        streak.recordActivity(day4);
        assertThat(streak.getCurrentStreak()).isEqualTo(4);

        streak.recordActivity(day5);
        assertThat(streak.getCurrentStreak()).isEqualTo(5);

        assertThat(streak.getLongestStreak()).isEqualTo(5);
        assertThat(streak.getLastActivityDate()).isEqualTo(day5);
    }
}
