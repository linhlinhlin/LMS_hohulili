package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.application.port.StudentAnalyticsQueryPort;
import com.example.lms.learning_delivery.domain.model.Achievement;
import com.example.lms.learning_delivery.domain.model.LearningStreak;
import com.example.lms.learning_delivery.domain.model.Notification;
import com.example.lms.learning_delivery.domain.model.StudentAchievement;
import com.example.lms.learning_delivery.domain.repository.AchievementRepository;
import com.example.lms.learning_delivery.domain.repository.LearningEventRepository;
import com.example.lms.learning_delivery.domain.repository.LearningStreakRepository;
import com.example.lms.learning_delivery.domain.repository.NotificationRepository;
import com.example.lms.learning_delivery.domain.repository.StudentAchievementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class GamificationUseCase {

    private final LearningStreakRepository streakRepository;
    private final AchievementRepository achievementRepository;
    private final StudentAchievementRepository studentAchievementRepository;
    private final NotificationRepository notificationRepository;
    private final LearningEventRepository learningEventRepository;
    private final StudentAnalyticsQueryPort analyticsQuery;

    // ============== Streak Management ==============

    @Transactional
    public StreakResponse updateStreak(UUID studentId) {
        LocalDate today = LocalDate.now();

        LearningStreak streak = streakRepository.findByStudentId(studentId)
                .orElseGet(() -> {
                    LearningStreak newStreak = LearningStreak.create(studentId);
                    return streakRepository.save(newStreak);
                });

        // Skip save + achievement check if already recorded today (idempotent)
        boolean alreadyRecordedToday = today.equals(streak.getLastActivityDate());
        streak.recordActivity(today);

        if (!alreadyRecordedToday) {
            LearningStreak saved = streakRepository.save(streak);
            checkStreakAchievements(studentId, saved.getCurrentStreak());
            // Run full achievement check once per day (covers COMPLETION, QUIZ, TIME)
            checkAndAwardAchievements(studentId);
            return toStreakResponse(saved);
        }

        return toStreakResponse(streak);
    }

    // ============== Achievement Management ==============

    @Transactional
    public List<AchievementResponse> checkAndAwardAchievements(UUID studentId) {
        List<Achievement> allAchievements = achievementRepository.findAll();
        List<AchievementResponse> newlyEarned = new ArrayList<>();

        for (Achievement achievement : allAchievements) {
            if (studentAchievementRepository.existsByStudentIdAndAchievementId(studentId, achievement.id())) {
                continue; // Already earned
            }

            boolean earned = checkAchievementThreshold(studentId, achievement);
            if (earned) {
                StudentAchievement sa = StudentAchievement.create(studentId, achievement.id());
                StudentAchievement savedSa = studentAchievementRepository.save(sa);

                // Create notification
                createNotification(studentId, "ACHIEVEMENT",
                        "Huy hieu moi: " + achievement.name(),
                        achievement.description(),
                        "/student/dashboard");

                newlyEarned.add(toAchievementResponse(achievement, savedSa.earnedAt()));
            }
        }

        return newlyEarned;
    }

    private boolean checkAchievementThreshold(UUID studentId, Achievement achievement) {
        return switch (achievement.category()) {
            case "STREAK" -> {
                LearningStreak streak = streakRepository.findByStudentId(studentId).orElse(null);
                yield streak != null && streak.getCurrentStreak() >= achievement.threshold();
            }
            case "COMPLETION" -> {
                if ("FIRST_LESSON".equals(achievement.code())) {
                    long eventCount = learningEventRepository.countByStudentId(studentId);
                    yield eventCount > 0;
                }
                // COURSE_1 (threshold=1), COURSE_5 (threshold=5), etc.
                long completedCourses = analyticsQuery.countCompletedCourses(studentId);
                yield completedCourses >= achievement.threshold();
            }
            case "TIME" -> {
                Long totalSeconds = learningEventRepository.sumTimeSpentByStudentId(studentId);
                int totalMinutes = totalSeconds != null ? (int)(totalSeconds / 60) : 0;
                yield totalMinutes >= achievement.threshold();
            }
            case "QUIZ" -> {
                // QUIZ_PERFECT: student has at least 1 perfect quiz score (100%)
                long perfectCount = analyticsQuery.countPerfectQuizAttempts(studentId);
                yield perfectCount >= achievement.threshold();
            }
            default -> false;
        };
    }

    private void checkStreakAchievements(UUID studentId, int currentStreak) {
        List<Achievement> streakAchievements = achievementRepository.findByCategory("STREAK");
        for (Achievement achievement : streakAchievements) {
            if (currentStreak >= achievement.threshold()
                    && !studentAchievementRepository.existsByStudentIdAndAchievementId(studentId, achievement.id())) {
                StudentAchievement sa = StudentAchievement.create(studentId, achievement.id());
                studentAchievementRepository.save(sa);

                createNotification(studentId, "ACHIEVEMENT",
                        "Huy hieu moi: " + achievement.name(),
                        achievement.description(),
                        "/student/dashboard");
            }
        }
    }

    // ============== Gamification Profile ==============

    @Transactional(readOnly = true)
    public GamificationProfileResponse getProfile(UUID studentId) {
        LearningStreak streak = streakRepository.findByStudentId(studentId)
                .orElse(LearningStreak.create(studentId));

        List<StudentAchievement> studentAchievements = studentAchievementRepository.findByStudentId(studentId);
        List<AchievementResponse> achievements = new ArrayList<>();
        for (StudentAchievement sa : studentAchievements) {
            achievementRepository.findById(sa.achievementId())
                    .ifPresent(a -> achievements.add(toAchievementResponse(a, sa.earnedAt())));
        }

        // Get today's study time
        Long todaySeconds = learningEventRepository.sumTimeSpentByStudentId(studentId);
        int todayMinutes = todaySeconds != null ? (int)(todaySeconds / 60) : 0;

        return new GamificationProfileResponse(
                toStreakResponse(streak),
                achievements,
                30, // default daily goal minutes
                todayMinutes,
                studentAchievements.size()
        );
    }

    // ============== Notifications ==============

    @Transactional
    public void createNotification(UUID userId, String type, String title, String message, String link) {
        Notification notification = Notification.create(userId, type, title, message, link);
        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotifications(UUID userId, int page, int size) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size))
                .map(this::toNotificationResponse);
    }

    @Transactional
    public void markNotificationRead(UUID notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.markAsRead();
            notificationRepository.save(n);
        });
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    // ============== DTOs ==============

    public record StreakResponse(int currentStreak, int longestStreak, String lastActivityDate) {}

    public record AchievementResponse(UUID id, String code, String name, String description,
                                       String icon, String category, Instant earnedAt) {}

    public record GamificationProfileResponse(StreakResponse streak, List<AchievementResponse> achievements,
                                               int dailyGoalMinutes, int todayStudyMinutes,
                                               int totalAchievements) {}

    public record NotificationResponse(UUID id, String type, String title, String message,
                                        String link, boolean isRead, Instant createdAt) {}

    // ============== Mappers ==============

    private StreakResponse toStreakResponse(LearningStreak streak) {
        return new StreakResponse(
                streak.getCurrentStreak(),
                streak.getLongestStreak(),
                streak.getLastActivityDate() != null ? streak.getLastActivityDate().toString() : null
        );
    }

    private AchievementResponse toAchievementResponse(Achievement achievement, Instant earnedAt) {
        return new AchievementResponse(achievement.id(), achievement.code(), achievement.name(),
                achievement.description(), achievement.icon(), achievement.category(), earnedAt);
    }

    private NotificationResponse toNotificationResponse(Notification notification) {
        return new NotificationResponse(notification.getId(), notification.getType(), notification.getTitle(),
                notification.getMessage(), notification.getLink(), notification.isRead(), notification.getCreatedAt());
    }
}
