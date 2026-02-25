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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GamificationUseCaseTest {

    @Mock private LearningStreakRepository streakRepository;
    @Mock private AchievementRepository achievementRepository;
    @Mock private StudentAchievementRepository studentAchievementRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private LearningEventRepository learningEventRepository;
    @Mock private StudentAnalyticsQueryPort analyticsQuery;

    private GamificationUseCase useCase;

    private final UUID studentId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        useCase = new GamificationUseCase(streakRepository, achievementRepository,
                studentAchievementRepository, notificationRepository, learningEventRepository,
                analyticsQuery);
    }

    // ============== Streak Tests ==============

    @Test
    @DisplayName("updateStreak creates streak with value 1 when student has no existing streak")
    void updateStreak_firstTime_createsStreak() {
        LearningStreak newStreak = LearningStreak.create(studentId);
        when(streakRepository.findByStudentId(studentId)).thenReturn(Optional.empty());
        when(streakRepository.save(any(LearningStreak.class))).thenAnswer(inv -> inv.getArgument(0));
        when(achievementRepository.findByCategory("STREAK")).thenReturn(List.of());
        when(achievementRepository.findAll()).thenReturn(List.of());

        GamificationUseCase.StreakResponse response = useCase.updateStreak(studentId);

        assertThat(response.currentStreak()).isEqualTo(1);
        assertThat(response.longestStreak()).isEqualTo(1);
        // save called twice: once for initial creation in orElseGet, once for daily update
        verify(streakRepository, times(2)).save(any(LearningStreak.class));
    }

    @Test
    @DisplayName("updateStreak increments streak when last activity was yesterday")
    void updateStreak_consecutiveDay_incrementsStreak() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        LearningStreak existingStreak = new LearningStreak(
                UUID.randomUUID(), studentId, 5, 10, yesterday, null, Instant.now());
        when(streakRepository.findByStudentId(studentId)).thenReturn(Optional.of(existingStreak));
        when(streakRepository.save(any(LearningStreak.class))).thenAnswer(inv -> inv.getArgument(0));
        when(achievementRepository.findByCategory("STREAK")).thenReturn(List.of());
        when(achievementRepository.findAll()).thenReturn(List.of());

        GamificationUseCase.StreakResponse response = useCase.updateStreak(studentId);

        assertThat(response.currentStreak()).isEqualTo(6);
        assertThat(response.longestStreak()).isEqualTo(10); // 6 < 10, so longest unchanged
    }

    @Test
    @DisplayName("updateStreak does not change streak when called on same day")
    void updateStreak_sameDay_noChange() {
        LocalDate today = LocalDate.now();
        LearningStreak existingStreak = new LearningStreak(
                UUID.randomUUID(), studentId, 3, 5, today, null, Instant.now());
        when(streakRepository.findByStudentId(studentId)).thenReturn(Optional.of(existingStreak));

        GamificationUseCase.StreakResponse response = useCase.updateStreak(studentId);

        assertThat(response.currentStreak()).isEqualTo(3);
        assertThat(response.longestStreak()).isEqualTo(5);
        // No save when already recorded today (optimization)
        verify(streakRepository, never()).save(any(LearningStreak.class));
    }

    @Test
    @DisplayName("updateStreak resets to 1 when streak is broken (gap > 1 day, not frozen)")
    void updateStreak_streakBroken_resetsToOne() {
        LocalDate threeDaysAgo = LocalDate.now().minusDays(3);
        LearningStreak existingStreak = new LearningStreak(
                UUID.randomUUID(), studentId, 7, 10, threeDaysAgo, null, Instant.now());
        when(streakRepository.findByStudentId(studentId)).thenReturn(Optional.of(existingStreak));
        when(streakRepository.save(any(LearningStreak.class))).thenAnswer(inv -> inv.getArgument(0));
        when(achievementRepository.findByCategory("STREAK")).thenReturn(List.of());
        when(achievementRepository.findAll()).thenReturn(List.of());

        GamificationUseCase.StreakResponse response = useCase.updateStreak(studentId);

        assertThat(response.currentStreak()).isEqualTo(1);
        assertThat(response.longestStreak()).isEqualTo(10); // longest stays at 10
    }

    @Test
    @DisplayName("updateStreak continues streak when frozen until today or later")
    void updateStreak_frozenStreak_continues() {
        LocalDate threeDaysAgo = LocalDate.now().minusDays(3);
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        LearningStreak existingStreak = new LearningStreak(
                UUID.randomUUID(), studentId, 5, 5, threeDaysAgo, tomorrow, Instant.now());
        when(streakRepository.findByStudentId(studentId)).thenReturn(Optional.of(existingStreak));
        when(streakRepository.save(any(LearningStreak.class))).thenAnswer(inv -> inv.getArgument(0));
        when(achievementRepository.findByCategory("STREAK")).thenReturn(List.of());
        when(achievementRepository.findAll()).thenReturn(List.of());

        GamificationUseCase.StreakResponse response = useCase.updateStreak(studentId);

        assertThat(response.currentStreak()).isEqualTo(6); // frozen allows continuation
    }

    @Test
    @DisplayName("updateStreak updates longestStreak when current exceeds it")
    void updateStreak_updatesLongestStreak() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        LearningStreak existingStreak = new LearningStreak(
                UUID.randomUUID(), studentId, 9, 9, yesterday, null, Instant.now());
        when(streakRepository.findByStudentId(studentId)).thenReturn(Optional.of(existingStreak));
        when(streakRepository.save(any(LearningStreak.class))).thenAnswer(inv -> inv.getArgument(0));
        when(achievementRepository.findByCategory("STREAK")).thenReturn(List.of());
        when(achievementRepository.findAll()).thenReturn(List.of());

        GamificationUseCase.StreakResponse response = useCase.updateStreak(studentId);

        assertThat(response.currentStreak()).isEqualTo(10);
        assertThat(response.longestStreak()).isEqualTo(10); // updated from 9 to 10
    }

    // ============== Achievement Tests ==============

    @Test
    @DisplayName("checkAndAwardAchievements earns STREAK achievement when threshold met")
    void checkAndAwardAchievements_earnsStreakAchievement() {
        UUID achievementId = UUID.randomUUID();
        Achievement achievement = new Achievement(achievementId, "STREAK_7", "7 Day Streak",
                "Maintained a 7-day streak", "fire", "STREAK", 7);

        LearningStreak streak = new LearningStreak(
                UUID.randomUUID(), studentId, 7, 7, LocalDate.now(), null, Instant.now());

        when(achievementRepository.findAll()).thenReturn(List.of(achievement));
        when(studentAchievementRepository.existsByStudentIdAndAchievementId(studentId, achievementId))
                .thenReturn(false);
        when(streakRepository.findByStudentId(studentId)).thenReturn(Optional.of(streak));
        when(studentAchievementRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(notificationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<GamificationUseCase.AchievementResponse> result = useCase.checkAndAwardAchievements(studentId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).code()).isEqualTo("STREAK_7");
        assertThat(result.get(0).name()).isEqualTo("7 Day Streak");
        verify(studentAchievementRepository).save(any(StudentAchievement.class));
        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    @DisplayName("checkAndAwardAchievements skips achievement already earned by student")
    void checkAndAwardAchievements_skipsAlreadyEarned() {
        UUID achievementId = UUID.randomUUID();
        Achievement achievement = new Achievement(achievementId, "STREAK_7", "7 Day Streak",
                "Maintained a 7-day streak", null, "STREAK", 7);

        when(achievementRepository.findAll()).thenReturn(List.of(achievement));
        when(studentAchievementRepository.existsByStudentIdAndAchievementId(studentId, achievementId))
                .thenReturn(true); // Already earned

        List<GamificationUseCase.AchievementResponse> result = useCase.checkAndAwardAchievements(studentId);

        assertThat(result).isEmpty();
        verify(studentAchievementRepository, never()).save(any());
    }

    @Test
    @DisplayName("checkAndAwardAchievements earns FIRST_LESSON from COMPLETION events")
    void checkAndAwardAchievements_earnsFirstLessonFromEvents() {
        UUID achievementId = UUID.randomUUID();
        Achievement achievement = new Achievement(achievementId, "FIRST_LESSON", "First Lesson",
                "Completed your first lesson", "book", "COMPLETION", 1);

        when(achievementRepository.findAll()).thenReturn(List.of(achievement));
        when(studentAchievementRepository.existsByStudentIdAndAchievementId(studentId, achievementId))
                .thenReturn(false);
        when(learningEventRepository.countByStudentId(studentId)).thenReturn(5L); // Has events
        when(studentAchievementRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(notificationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<GamificationUseCase.AchievementResponse> result = useCase.checkAndAwardAchievements(studentId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).code()).isEqualTo("FIRST_LESSON");
        verify(learningEventRepository).countByStudentId(studentId);
    }

    @Test
    @DisplayName("checkAndAwardAchievements earns TIME achievement when study time meets threshold")
    void checkAndAwardAchievements_earnsTimeAchievement() {
        UUID achievementId = UUID.randomUUID();
        Achievement achievement = new Achievement(achievementId, "STUDY_60", "1 Hour Learner",
                "Studied for 60 minutes total", "clock", "TIME", 60);

        when(achievementRepository.findAll()).thenReturn(List.of(achievement));
        when(studentAchievementRepository.existsByStudentIdAndAchievementId(studentId, achievementId))
                .thenReturn(false);
        when(learningEventRepository.sumTimeSpentByStudentId(studentId)).thenReturn(3600L); // 60 minutes
        when(studentAchievementRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(notificationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<GamificationUseCase.AchievementResponse> result = useCase.checkAndAwardAchievements(studentId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).code()).isEqualTo("STUDY_60");
        verify(learningEventRepository).sumTimeSpentByStudentId(studentId);
    }

    // ============== Profile Tests ==============

    @Test
    @DisplayName("getProfile returns complete profile with streak, achievements, and study time")
    void getProfile_returnsCompleteProfile() {
        UUID achievementId = UUID.randomUUID();
        LearningStreak streak = new LearningStreak(
                UUID.randomUUID(), studentId, 5, 12, LocalDate.now(), null, Instant.now());

        Achievement achievement = new Achievement(achievementId, "STREAK_7", "7 Day Streak",
                "Maintained a 7-day streak", "fire", "STREAK", 7);

        StudentAchievement studentAchievement = new StudentAchievement(
                UUID.randomUUID(), studentId, achievementId, Instant.now());

        when(streakRepository.findByStudentId(studentId)).thenReturn(Optional.of(streak));
        when(studentAchievementRepository.findByStudentId(studentId)).thenReturn(List.of(studentAchievement));
        when(achievementRepository.findById(achievementId)).thenReturn(Optional.of(achievement));
        when(learningEventRepository.sumTimeSpentByStudentId(studentId)).thenReturn(1800L); // 30 minutes

        GamificationUseCase.GamificationProfileResponse profile = useCase.getProfile(studentId);

        assertThat(profile.streak().currentStreak()).isEqualTo(5);
        assertThat(profile.streak().longestStreak()).isEqualTo(12);
        assertThat(profile.achievements()).hasSize(1);
        assertThat(profile.achievements().get(0).code()).isEqualTo("STREAK_7");
        assertThat(profile.dailyGoalMinutes()).isEqualTo(30);
        assertThat(profile.todayStudyMinutes()).isEqualTo(30); // 1800 / 60
        assertThat(profile.totalAchievements()).isEqualTo(1);
    }

    @Test
    @DisplayName("getProfile returns default values for new student with no data")
    void getProfile_newStudent_returnsDefaults() {
        when(streakRepository.findByStudentId(studentId)).thenReturn(Optional.empty());
        when(studentAchievementRepository.findByStudentId(studentId)).thenReturn(List.of());
        when(learningEventRepository.sumTimeSpentByStudentId(studentId)).thenReturn(null);

        GamificationUseCase.GamificationProfileResponse profile = useCase.getProfile(studentId);

        assertThat(profile.streak().currentStreak()).isZero();
        assertThat(profile.streak().longestStreak()).isZero();
        assertThat(profile.achievements()).isEmpty();
        assertThat(profile.dailyGoalMinutes()).isEqualTo(30);
        assertThat(profile.todayStudyMinutes()).isZero();
        assertThat(profile.totalAchievements()).isZero();
    }

    // ============== Notification Tests ==============

    @Test
    @DisplayName("createNotification saves notification with correct fields")
    void createNotification_savesNotification() {
        when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        useCase.createNotification(studentId, "ACHIEVEMENT", "New Badge", "You earned a badge!", "/dashboard");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());

        Notification saved = captor.getValue();
        assertThat(saved.getUserId()).isEqualTo(studentId);
        assertThat(saved.getType()).isEqualTo("ACHIEVEMENT");
        assertThat(saved.getTitle()).isEqualTo("New Badge");
        assertThat(saved.getMessage()).isEqualTo("You earned a badge!");
        assertThat(saved.getLink()).isEqualTo("/dashboard");
        assertThat(saved.isRead()).isFalse();
    }

    @Test
    @DisplayName("markNotificationRead sets isRead to true on existing notification")
    void markNotificationRead_setsIsRead() {
        UUID notificationId = UUID.randomUUID();
        Notification notification = new Notification(notificationId, studentId, "ACHIEVEMENT",
                "Test", "Test message", null, false, Instant.now());

        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(notification));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        useCase.markNotificationRead(notificationId, studentId);

        assertThat(notification.isRead()).isTrue();
        verify(notificationRepository).save(notification);
    }

    @Test
    @DisplayName("markNotificationRead throws AccessDeniedException for wrong user")
    void markNotificationRead_wrongUser_throwsAccessDenied() {
        UUID notificationId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        Notification notification = new Notification(notificationId, studentId, "ACHIEVEMENT",
                "Test", "Test message", null, false, Instant.now());

        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(notification));

        assertThatThrownBy(() -> useCase.markNotificationRead(notificationId, otherUserId))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(notificationRepository, never()).save(any());
    }

    @Test
    @DisplayName("getUnreadCount returns correct count of unread notifications")
    void getUnreadCount_returnsCorrectCount() {
        when(notificationRepository.countByUserIdAndIsReadFalse(studentId)).thenReturn(7L);

        long count = useCase.getUnreadCount(studentId);

        assertThat(count).isEqualTo(7L);
        verify(notificationRepository).countByUserIdAndIsReadFalse(studentId);
    }

    @Test
    @DisplayName("markAllNotificationsRead calls repository batch update")
    void markAllNotificationsRead_callsRepository() {
        useCase.markAllNotificationsRead(studentId);

        verify(notificationRepository).markAllReadByUserId(studentId);
    }

    @Test
    @DisplayName("markAllNotificationsRead is idempotent — safe to call when all already read")
    void markAllNotificationsRead_idempotent() {
        useCase.markAllNotificationsRead(studentId);
        useCase.markAllNotificationsRead(studentId);

        verify(notificationRepository, times(2)).markAllReadByUserId(studentId);
    }

    @Test
    @DisplayName("deleteNotification removes notification owned by user")
    void deleteNotification_ownerDeletes_success() {
        UUID notificationId = UUID.randomUUID();
        Notification notification = new Notification(notificationId, studentId, "ACHIEVEMENT",
                "Test", "Test message", null, false, Instant.now());

        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(notification));

        useCase.deleteNotification(notificationId, studentId);

        verify(notificationRepository).deleteById(notificationId);
    }

    @Test
    @DisplayName("deleteNotification throws AccessDeniedException for wrong user")
    void deleteNotification_wrongUser_throwsAccessDenied() {
        UUID notificationId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        Notification notification = new Notification(notificationId, studentId, "ACHIEVEMENT",
                "Test", "Test message", null, false, Instant.now());

        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(notification));

        assertThatThrownBy(() -> useCase.deleteNotification(notificationId, otherUserId))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(notificationRepository, never()).deleteById(any());
    }
}
