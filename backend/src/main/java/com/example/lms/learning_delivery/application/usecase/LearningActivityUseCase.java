package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningEvent;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepository;
import com.example.lms.learning_delivery.domain.repository.LearningEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Use case for tracking learning activity — time spent, heartbeats,
 * reading progress, and "continue where you left off".
 *
 * Pattern reference: Coursera heartbeat (30s interval), edX time-on-task,
 * xAPI Video Profile "experienced" statements.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LearningActivityUseCase {

    private final LearningEventRepository learningEventRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final GamificationUseCase gamificationUseCase;

    /**
     * Record a heartbeat from the frontend.
     * Called every 30 seconds while a student is actively engaged with content.
     *
     * @param studentId  the student
     * @param lessonId   current lesson
     * @param sectionId  current section (nullable)
     * @param timeSpentSeconds seconds since last heartbeat (typically 30)
     * @param contentType VIDEO, TEXT, QUIZ, FILE, etc.
     */
    @Transactional
    public void recordHeartbeat(UUID studentId, UUID lessonId, String sectionId,
                                 int timeSpentSeconds, String contentType) {
        learningEventRepository.save(LearningEvent.create(
                studentId, lessonId, sectionId,
                LearningEvent.EventType.HEARTBEAT,
                Map.of(
                        "timeSpentSeconds", timeSpentSeconds,
                        "contentType", contentType != null ? contentType : "UNKNOWN"
                )
        ));

        // Auto-trigger streak update + achievement check on heartbeat
        try {
            gamificationUseCase.updateStreak(studentId);
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("Failed to update streak for student {}: {}", studentId, e.getMessage());
        }
    }

    /**
     * Record reading progress for TEXT sections.
     * Called when scroll reaches a threshold (e.g., 80%).
     */
    @Transactional
    public void recordReadingProgress(UUID studentId, UUID lessonId, String sectionId,
                                       double scrollPercent) {
        learningEventRepository.save(LearningEvent.create(
                studentId, lessonId, sectionId,
                LearningEvent.EventType.READING_PROGRESS,
                Map.of("scrollPercent", scrollPercent)
        ));
    }

    /**
     * Get "continue where you left off" data.
     *
     * SOTA (Canvas/Coursera): Uses enrollment.lastAccessedAt + progress.lastActivity
     * as PRIMARY source. This is always accurate because updateProgress() sets both
     * timestamps on every lesson interaction (mark complete, watch video, etc.).
     *
     * Falls back to learning_events for students who only viewed content without
     * marking progress (heartbeat-only engagement).
     */
    @Transactional(readOnly = true)
    public ContinueWhereLeftOffDTO getContinueWhereLeftOff(UUID studentId) {
        // Primary: Find most recently accessed ACTIVE enrollment with progress
        List<Enrollment> activeEnrollments = enrollmentRepository.findActiveByStudentId(studentId);

        ContinueWhereLeftOffDTO fromEnrollment = activeEnrollments.stream()
                .filter(e -> e.getLastAccessedAt() != null
                        && e.getProgress() != null && !e.getProgress().isEmpty())
                .max(Comparator.comparing(Enrollment::getLastAccessedAt))
                .flatMap(enrollment -> {
                    // Find lesson with most recent lastActivity from progress map
                    return enrollment.getProgress().entrySet().stream()
                            .filter(entry -> entry.getValue().getLastActivity() != null)
                            .max(Comparator.comparing(entry -> entry.getValue().getLastActivity()))
                            .map(entry -> {
                                UUID courseId = enrollment.getLearningClass() != null
                                        ? enrollment.getLearningClass().getCourseId() : null;
                                try {
                                    return new ContinueWhereLeftOffDTO(
                                            UUID.fromString(entry.getKey()),
                                            null,
                                            "PROGRESS_UPDATE",
                                            entry.getValue().getLastActivity(),
                                            courseId
                                    );
                                } catch (IllegalArgumentException e) {
                                    log.warn("Invalid lesson UUID in progress map: {}", entry.getKey());
                                    return null;
                                }
                            });
                })
                .orElse(null);

        if (fromEnrollment != null) {
            return fromEnrollment;
        }

        // Fallback: Use learning events (for heartbeat-only engagement)
        return learningEventRepository.findLastActivityEvent(studentId)
                .map(event -> new ContinueWhereLeftOffDTO(
                        event.getLessonId(),
                        event.getSectionId(),
                        event.getEventType().name(),
                        event.getCreatedAt(),
                        null
                ))
                .orElse(null);
    }

    /**
     * Get today's total study time for a student (in seconds).
     */
    @Transactional(readOnly = true)
    public long getTodayStudyTimeSeconds(UUID studentId) {
        Instant startOfDay = Instant.now().truncatedTo(ChronoUnit.DAYS);
        return learningEventRepository.sumTimeSpentSince(studentId, startOfDay);
    }

    // DTOs
    public record HeartbeatRequest(
            UUID lessonId,
            String sectionId,
            int timeSpentSeconds,
            String contentType
    ) {}

    public record ReadingProgressRequest(
            UUID lessonId,
            String sectionId,
            double scrollPercent
    ) {}

    public record ContinueWhereLeftOffDTO(
            UUID lessonId,
            String sectionId,
            String lastEventType,
            Instant lastActivityAt,
            UUID courseId
    ) {}

    public record StudyTimeResponse(
            long todaySeconds,
            String todayFormatted
    ) {
        public static StudyTimeResponse from(long seconds) {
            long hours = seconds / 3600;
            long mins = (seconds % 3600) / 60;
            String formatted = hours > 0
                    ? hours + "h " + mins + "m"
                    : mins + " phút";
            return new StudyTimeResponse(seconds, formatted);
        }
    }
}
