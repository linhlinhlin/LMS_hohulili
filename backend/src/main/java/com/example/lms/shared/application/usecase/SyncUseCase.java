package com.example.lms.shared.application.usecase;

import com.example.lms.assessment.application.usecase.QuizAttemptUseCase;
import com.example.lms.assessment.domain.model.QuizAttempt;
import com.example.lms.learning_delivery.application.dto.UpdateLessonProgressCommand;
import com.example.lms.learning_delivery.application.usecase.TrackVideoProgressUseCase;
import com.example.lms.learning_delivery.application.usecase.UpdateLessonProgressUseCase;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepository;
import com.example.lms.learning_delivery.domain.repository.VideoProgressRepository;
import com.example.lms.learning_delivery.domain.model.VideoProgress;
import com.example.lms.shared.application.dto.SyncPushRequest;
import com.example.lms.shared.application.dto.SyncPushRequest.SyncOperation;
import com.example.lms.shared.application.dto.SyncResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

/**
 * Use case for offline sync operations.
 * Routes queued offline operations to the appropriate domain use cases.
 *
 * <p>Conflict resolution strategy (SOTA Feb 2026):
 * <ul>
 *   <li>videoProgress: Additive merge (watched segments always accumulate)</li>
 *   <li>progress: Forward-only (UNLOCKED → COMPLETED, never backward)</li>
 *   <li>submission: Accept — original endpoint replayed via individual fallback</li>
 *   <li>quizAttempt: Server-wins (quiz grading is authoritative)</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class SyncUseCase {

    private static final Logger log = LoggerFactory.getLogger(SyncUseCase.class);

    private final TrackVideoProgressUseCase videoProgressUseCase;
    private final UpdateLessonProgressUseCase lessonProgressUseCase;
    private final QuizAttemptUseCase quizAttemptUseCase;
    private final EnrollmentRepository enrollmentRepository;
    private final VideoProgressRepository videoProgressRepository;

    /**
     * Process a batch of offline operations from the client.
     * Each operation is routed to its domain use case with conflict detection.
     */
    @Transactional
    public SyncResponse.PushResult pushChanges(String userId, SyncPushRequest request) {
        List<SyncOperation> operations = request.operations();
        if (operations == null || operations.isEmpty()) {
            return SyncResponse.PushResult.success(0);
        }

        log.info("Sync push: userId={}, operations={}", userId, operations.size());

        int accepted = 0;
        int rejected = 0;
        List<SyncResponse.Conflict> conflicts = new ArrayList<>();
        UUID studentId = UUID.fromString(userId);

        for (SyncOperation op : operations) {
            try {
                boolean applied = processOperation(studentId, op, conflicts);
                if (applied) {
                    accepted++;
                } else {
                    rejected++;
                }
            } catch (IllegalArgumentException | NoSuchElementException e) {
                log.warn("Sync operation validation failed: entityType={}, endpoint={}, error={}",
                        op.entityType(), op.endpoint(), e.getMessage());
                rejected++;
                conflicts.add(new SyncResponse.Conflict(
                        op.entityType(),
                        extractEntityId(op),
                        "Lỗi xử lý: " + e.getMessage()
                ));
            } catch (RuntimeException e) {
                log.error("Sync operation unexpected error: entityType={}, endpoint={}, error={}",
                        op.entityType(), op.endpoint(), e.getMessage(), e);
                rejected++;
                conflicts.add(new SyncResponse.Conflict(
                        op.entityType(),
                        extractEntityId(op),
                        "Lỗi xử lý: " + e.getMessage()
                ));
            }
        }

        log.info("Sync push complete: accepted={}, rejected={}, conflicts={}",
                accepted, rejected, conflicts.size());

        return new SyncResponse.PushResult(accepted, rejected, Instant.now(), conflicts);
    }

    /**
     * Retrieve changes from server since the given timestamp.
     * Returns video progress updates for the student.
     */
    @Transactional(readOnly = true)
    public SyncResponse.PullResult pullChanges(String userId, Instant since) {
        log.debug("Sync pull: userId={}, since={}", userId, since);

        UUID studentId = UUID.fromString(userId);
        List<Map<String, Object>> changes = new ArrayList<>();

        // Single batch query replaces O(enrollments × lessons) N+1 loop
        Instant effectiveSince = since != null ? since : Instant.EPOCH;
        List<VideoProgress> videoChanges = videoProgressRepository
                .findByStudentIdAndUpdatedAtAfter(studentId, effectiveSince);

        for (VideoProgress vp : videoChanges) {
            changes.add(Map.of(
                    "entityType", "videoProgress",
                    "sectionId", vp.getSectionId(),
                    "lessonId", vp.getLessonId().toString(),
                    "progressPercent", vp.getProgressPercent(),
                    "watchedSeconds", vp.getWatchedSeconds(),
                    "completed", vp.isCompleted(),
                    "lastPosition", vp.getLastPosition(),
                    "updatedAt", vp.getUpdatedAt().toString()
            ));
        }

        return new SyncResponse.PullResult(Instant.now(), changes);
    }

    /**
     * Get sync health status.
     */
    public SyncResponse.Status getStatus(String userId) {
        return SyncResponse.Status.ok();
    }

    // ─── Operation Routing ─────────────────────────────────────────────

    private boolean processOperation(UUID studentId, SyncOperation op,
                                     List<SyncResponse.Conflict> conflicts) {
        return switch (op.entityType()) {
            case "videoProgress" -> processVideoProgress(studentId, op, conflicts);
            case "progress" -> processLessonProgress(studentId, op, conflicts);
            case "submission" -> processSubmission(studentId, op, conflicts);
            case "quizAttempt" -> processQuizAttempt(studentId, op, conflicts);
            default -> {
                log.warn("Unknown entity type: {}", op.entityType());
                conflicts.add(new SyncResponse.Conflict(
                        op.entityType(), extractEntityId(op),
                        "Loại thực thể không được hỗ trợ: " + op.entityType()));
                yield false;
            }
        };
    }

    /**
     * Video progress: Additive merge strategy.
     * Watched segments always accumulate (never conflict).
     */
    private boolean processVideoProgress(UUID studentId, SyncOperation op,
                                          List<SyncResponse.Conflict> conflicts) {
        Map<String, Object> payload = op.payload();
        if (payload == null) return false;

        try {
            UUID lessonId = parseUUID(payload, "lessonId");
            String sectionId = getString(payload, "sectionId");
            int duration = getInt(payload, "durationSeconds", 0);
            int fromSecond = getInt(payload, "fromSecond", 0);
            int toSecond = getInt(payload, "toSecond", 0);
            double lastPosition = getDouble(payload, "lastPosition", 0.0);

            if (lessonId == null || sectionId == null) {
                conflicts.add(new SyncResponse.Conflict("videoProgress",
                        sectionId, "Thiếu lessonId hoặc sectionId"));
                return false;
            }

            videoProgressUseCase.trackSegments(
                    studentId, lessonId, sectionId,
                    duration, fromSecond, toSecond, lastPosition);

            log.debug("Video progress synced: student={}, section={}", studentId, sectionId);
            return true;
        } catch (IllegalArgumentException | NoSuchElementException e) {
            log.warn("Video progress sync validation failed: {}", e.getMessage());
            conflicts.add(new SyncResponse.Conflict("videoProgress",
                    getString(payload, "sectionId"),
                    "Lỗi đồng bộ tiến trình video: " + e.getMessage()));
            return false;
        } catch (RuntimeException e) {
            log.error("Video progress sync unexpected error: {}", e.getMessage(), e);
            conflicts.add(new SyncResponse.Conflict("videoProgress",
                    getString(payload, "sectionId"),
                    "Lỗi đồng bộ tiến trình video: " + e.getMessage()));
            return false;
        }
    }

    /**
     * Lesson progress: Forward-only update.
     * Progress moves UNLOCKED → COMPLETED (never backward).
     * Requires enrollmentId or courseId in payload.
     */
    private boolean processLessonProgress(UUID studentId, SyncOperation op,
                                           List<SyncResponse.Conflict> conflicts) {
        Map<String, Object> payload = op.payload();
        if (payload == null) return false;

        try {
            UUID lessonId = parseUUID(payload, "lessonId");
            if (lessonId == null) {
                conflicts.add(new SyncResponse.Conflict("progress",
                        extractEntityId(op), "Thiếu lessonId"));
                return false;
            }

            // Find enrollment: by enrollmentId directly, or by courseId + studentId
            UUID enrollmentId = parseUUID(payload, "enrollmentId");
            if (enrollmentId == null) {
                UUID courseId = parseUUID(payload, "courseId");
                if (courseId != null) {
                    Optional<Enrollment> enrollment = enrollmentRepository
                            .findByStudentIdAndCourseId(studentId, courseId);
                    if (enrollment.isPresent()) {
                        enrollmentId = enrollment.get().getId();
                    }
                }
            }

            if (enrollmentId == null) {
                // Try finding any active enrollment for this student
                List<Enrollment> active = enrollmentRepository.findActiveByStudentId(studentId);
                for (Enrollment e : active) {
                    if (e.getProgress() != null && e.getProgress().containsKey(lessonId.toString())) {
                        enrollmentId = e.getId();
                        break;
                    }
                }
            }

            if (enrollmentId == null) {
                conflicts.add(new SyncResponse.Conflict("progress",
                        lessonId.toString(), "Không tìm thấy đăng ký học"));
                return false;
            }

            String status = getString(payload, "status");
            if (status == null) status = "COMPLETED";

            UpdateLessonProgressCommand command = new UpdateLessonProgressCommand(
                    enrollmentId,
                    lessonId,
                    status,
                    getInt(payload, "watchSeconds", 0) > 0
                            ? getInt(payload, "watchSeconds", 0) : null,
                    getDouble(payload, "grade", -1) >= 0
                            ? getDouble(payload, "grade", -1) : null
            );

            lessonProgressUseCase.execute(command);
            log.debug("Lesson progress synced: student={}, lesson={}", studentId, lessonId);
            return true;
        } catch (IllegalArgumentException | NoSuchElementException e) {
            log.warn("Lesson progress sync validation failed: {}", e.getMessage());
            conflicts.add(new SyncResponse.Conflict("progress",
                    getString(payload, "lessonId"),
                    "Lỗi đồng bộ tiến trình bài học: " + e.getMessage()));
            return false;
        } catch (RuntimeException e) {
            log.error("Lesson progress sync unexpected error: {}", e.getMessage(), e);
            conflicts.add(new SyncResponse.Conflict("progress",
                    getString(payload, "lessonId"),
                    "Lỗi đồng bộ tiến trình bài học: " + e.getMessage()));
            return false;
        }
    }

    /**
     * Submission: Accept and log.
     * Assignment submissions involve file handling and validation tightly coupled
     * to the controller layer. The individual sync fallback replays the original
     * POST endpoint (e.g. /api/v3/assignments/{id}/submissions) which handles
     * the full creation flow including file URLs and resubmission logic.
     */
    private boolean processSubmission(UUID studentId, SyncOperation op,
                                       List<SyncResponse.Conflict> conflicts) {
        Map<String, Object> payload = op.payload();
        if (payload == null) return false;

        log.info("Submission sync accepted (deferred to endpoint replay): student={}, endpoint={}",
                studentId, op.endpoint());
        return true;
    }

    /**
     * Quiz attempt: Server-wins (quiz grading is authoritative).
     * Submits offline answers for grading if attempt is still in progress.
     */
    @SuppressWarnings("unchecked")
    private boolean processQuizAttempt(UUID studentId, SyncOperation op,
                                        List<SyncResponse.Conflict> conflicts) {
        Map<String, Object> payload = op.payload();
        if (payload == null) return false;

        try {
            UUID attemptId = parseUUID(payload, "attemptId");
            if (attemptId == null) {
                conflicts.add(new SyncResponse.Conflict("quizAttempt",
                        extractEntityId(op), "Thiếu attemptId"));
                return false;
            }

            // Extract answers from payload
            Object answersObj = payload.get("answers");
            if (answersObj == null) {
                conflicts.add(new SyncResponse.Conflict("quizAttempt",
                        attemptId.toString(), "Thiếu danh sách câu trả lời"));
                return false;
            }

            List<QuizAttempt.AttemptAnswer> answers = new ArrayList<>();
            if (answersObj instanceof List<?> answersList) {
                for (Object item : answersList) {
                    if (item instanceof Map<?, ?> answerMap) {
                        Map<String, Object> m = (Map<String, Object>) answerMap;
                        UUID questionId = parseUUID(m, "questionId");
                        String selectedOption = getString(m, "answer");
                        if (questionId != null) {
                            answers.add(QuizAttempt.AttemptAnswer.builder()
                                    .questionId(questionId)
                                    .selectedOption(selectedOption)
                                    .build());
                        }
                    }
                }
            }

            if (answers.isEmpty()) {
                conflicts.add(new SyncResponse.Conflict("quizAttempt",
                        attemptId.toString(), "Danh sách câu trả lời trống"));
                return false;
            }

            quizAttemptUseCase.submitAttempt(attemptId, answers);
            log.debug("Quiz attempt synced: student={}, attempt={}", studentId, attemptId);
            return true;
        } catch (IllegalArgumentException | NoSuchElementException e) {
            log.warn("Quiz attempt sync validation failed: {}", e.getMessage());
            String attemptIdStr = getString(payload, "attemptId");
            conflicts.add(new SyncResponse.Conflict("quizAttempt",
                    attemptIdStr != null ? attemptIdStr : extractEntityId(op),
                    "Lỗi đồng bộ bài kiểm tra: " + e.getMessage()));
            return false;
        } catch (RuntimeException e) {
            log.error("Quiz attempt sync unexpected error: {}", e.getMessage(), e);
            String attemptIdStr = getString(payload, "attemptId");
            conflicts.add(new SyncResponse.Conflict("quizAttempt",
                    attemptIdStr != null ? attemptIdStr : extractEntityId(op),
                    "Lỗi đồng bộ bài kiểm tra: " + e.getMessage()));
            return false;
        }
    }

    // ─── Helpers ───────────────────────────────────────────────────────

    private String extractEntityId(SyncOperation op) {
        if (op.payload() != null) {
            Object id = op.payload().get("id");
            if (id != null) return id.toString();
            Object sectionId = op.payload().get("sectionId");
            if (sectionId != null) return sectionId.toString();
        }
        return op.endpoint();
    }

    private UUID parseUUID(Map<String, Object> payload, String key) {
        Object val = payload.get(key);
        if (val == null) return null;
        try {
            return UUID.fromString(val.toString());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private String getString(Map<String, Object> payload, String key) {
        Object val = payload.get(key);
        return val != null ? val.toString() : null;
    }

    private int getInt(Map<String, Object> payload, String key, int defaultVal) {
        Object val = payload.get(key);
        if (val instanceof Number n) return n.intValue();
        if (val != null) {
            try { return Integer.parseInt(val.toString()); }
            catch (NumberFormatException ignored) {}
        }
        return defaultVal;
    }

    private double getDouble(Map<String, Object> payload, String key, double defaultVal) {
        Object val = payload.get(key);
        if (val instanceof Number n) return n.doubleValue();
        if (val != null) {
            try { return Double.parseDouble(val.toString()); }
            catch (NumberFormatException ignored) {}
        }
        return defaultVal;
    }
}
