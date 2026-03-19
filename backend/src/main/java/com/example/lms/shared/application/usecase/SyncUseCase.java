package com.example.lms.shared.application.usecase;

import com.example.lms.assessment.application.usecase.QuizAttemptUseCase;
import com.example.lms.assessment.domain.model.QuizAttempt;
import com.example.lms.learning_delivery.application.dto.UpdateLessonProgressCommand;
import com.example.lms.learning_delivery.application.usecase.TrackVideoProgressUseCase;
import com.example.lms.learning_delivery.application.usecase.UpdateLessonProgressUseCase;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
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
import java.util.stream.Collectors;

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
        List<String> ackedOperationIds = new ArrayList<>();
        UUID studentId = UUID.fromString(userId);

        for (SyncOperation op : operations) {
            try {
                boolean applied = processOperation(studentId, op, conflicts);
                if (applied) {
                    accepted++;
                    if (op.clientOperationId() != null && !op.clientOperationId().isBlank()) {
                        ackedOperationIds.add(op.clientOperationId());
                    }
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

        return new SyncResponse.PushResult(accepted, rejected, Instant.now(), conflicts, ackedOperationIds);
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
        List<Map<String, Object>> courseStates = new ArrayList<>();
        List<Map<String, Object>> lessonProgress = new ArrayList<>();
        List<Map<String, Object>> videoProgress = new ArrayList<>();
        List<Map<String, Object>> quizAttempts = new ArrayList<>();
        List<SyncResponse.Conflict> conflicts = new ArrayList<>();

        for (Enrollment enrollment : enrollmentRepository.findActiveByStudentId(studentId)) {
            LearningClass learningClass = enrollment.getLearningClass();
            UUID courseId = learningClass != null ? learningClass.getCourseId() : null;

            Map<String, Object> courseState = new LinkedHashMap<>();
            courseState.put("courseId", courseId != null ? courseId.toString() : null);
            courseState.put("classId", learningClass != null && learningClass.getId() != null ? learningClass.getId().toString() : null);
            courseState.put("publicationId", learningClass != null && learningClass.getCourseVersionId() != null ? learningClass.getCourseVersionId().toString() : null);
            courseState.put("versionMode", learningClass != null && learningClass.getVersionMode() != null ? learningClass.getVersionMode().name() : "PINNED");
            courseState.put("completionPercent", enrollment.getCompletionPercent());
            courseState.put("status", enrollment.getStatus().name());
            courseStates.add(courseState);

            if (enrollment.getProgress() == null) {
                continue;
            }

            for (Map.Entry<String, Enrollment.LessonProgress> entry : enrollment.getProgress().entrySet()) {
                Enrollment.LessonProgress progress = entry.getValue();
                Map<String, Object> lessonProgressItem = new LinkedHashMap<>();
                lessonProgressItem.put("courseId", courseId != null ? courseId.toString() : null);
                lessonProgressItem.put("enrollmentId", enrollment.getId() != null ? enrollment.getId().toString() : null);
                lessonProgressItem.put("lessonId", entry.getKey());
                lessonProgressItem.put("status", progress != null ? progress.getStatus() : null);
                lessonProgressItem.put("watchSeconds", progress != null ? progress.getWatchSeconds() : null);
                lessonProgressItem.put("grade", progress != null ? progress.getGrade() : null);
                lessonProgressItem.put("lastActivity", progress != null && progress.getLastActivity() != null ? progress.getLastActivity().toString() : null);
                lessonProgressItem.put("completedSections", progress != null && progress.getCompletedSections() != null ? progress.getCompletedSections() : List.of());
                lessonProgress.add(lessonProgressItem);
                changes.add(new LinkedHashMap<>(lessonProgressItem));
            }
        }

        // Single batch query replaces O(enrollments × lessons) N+1 loop
        Instant effectiveSince = since != null ? since : Instant.EPOCH;
        List<VideoProgress> videoChanges = videoProgressRepository
                .findByStudentIdAndUpdatedAtAfter(studentId, effectiveSince);

        for (VideoProgress vp : videoChanges) {
            Map<String, Object> videoProgressItem = Map.of(
                    "entityType", "videoProgress",
                    "sectionId", vp.getSectionId(),
                    "lessonId", vp.getLessonId().toString(),
                    "progressPercent", vp.getProgressPercent(),
                    "watchedSeconds", vp.getWatchedSeconds(),
                    "completed", vp.isCompleted(),
                    "lastPosition", vp.getLastPosition(),
                    "updatedAt", vp.getUpdatedAt().toString()
            );
            videoProgress.add(videoProgressItem);
            changes.add(videoProgressItem);
        }

        return new SyncResponse.PullResult(Instant.now(), changes, courseStates, lessonProgress, videoProgress, quizAttempts, conflicts);
    }

    /**
     * Get sync health status.
     */
    public SyncResponse.Status getStatus(String userId) {
        return SyncResponse.Status.ok();
    }

    private SyncResponse.Conflict conflict(SyncOperation op, String entityType, String entityId, String message) {
        return new SyncResponse.Conflict(entityType, entityId, message, op != null ? op.clientOperationId() : null);
    }

    // ─── Operation Routing ─────────────────────────────────────────────

    private boolean processOperation(UUID studentId, SyncOperation op,
                                     List<SyncResponse.Conflict> conflicts) {
        SyncResponse.Conflict publicationConflict = detectPublicationConflict(studentId, op);
        if (publicationConflict != null) {
            conflicts.add(publicationConflict);
            return false;
        }

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
     *
     * <p>Offline quiz flow:
     * <ol>
     *   <li>Client queues {quizId, answers: Map&lt;questionId, optionKey&gt;} (no server attemptId yet)</li>
     *   <li>Server calls startAttempt(quizId, studentId) to create a real attempt</li>
     *   <li>Server transforms map answers → List&lt;AttemptAnswer&gt;</li>
     *   <li>Server grades via submitAttempt(attemptId, answers)</li>
     * </ol>
     */
    @SuppressWarnings("unchecked")
    private boolean processQuizAttempt(UUID studentId, SyncOperation op,
                                        List<SyncResponse.Conflict> conflicts) {
        Map<String, Object> payload = op.payload();
        if (payload == null) return false;

        try {
            // Offline payload sends quizId (not a pre-existing server attemptId)
            UUID quizId = parseUUID(payload, "quizId");
            if (quizId == null) {
                conflicts.add(new SyncResponse.Conflict("quizAttempt",
                        extractEntityId(op), "Thiếu quizId"));
                return false;
            }

            // Step 1: Start a server-side attempt for grading
            QuizAttempt attempt = quizAttemptUseCase.startAttempt(quizId, studentId);

            // Step 2: Convert answers from Map<questionId, optionKey> to List<AttemptAnswer>
            Object answersObj = payload.get("answers");
            if (answersObj == null) {
                conflicts.add(new SyncResponse.Conflict("quizAttempt",
                        quizId.toString(), "Thiếu danh sách câu trả lời"));
                return false;
            }

            List<QuizAttempt.AttemptAnswer> answers = new ArrayList<>();
            if (answersObj instanceof Map<?, ?> answersMap) {
                // Client stores: { "questionUUID": "optionKey" } or { "questionUUID": ["A","B"] }
                for (Map.Entry<?, ?> entry : answersMap.entrySet()) {
                    String qIdStr = entry.getKey().toString();
                    Object val = entry.getValue();
                    String selectedOption = null;
                    if (val instanceof String s) {
                        selectedOption = s;
                    } else if (val instanceof List<?> list && !list.isEmpty()) {
                        selectedOption = list.stream().map(Object::toString).collect(Collectors.joining(","));
                    } else if (val != null) {
                        selectedOption = val.toString();
                    }
                    try {
                        answers.add(QuizAttempt.AttemptAnswer.builder()
                                .questionId(UUID.fromString(qIdStr))
                                .selectedOption(selectedOption)
                                .build());
                    } catch (IllegalArgumentException e) {
                        log.warn("Invalid questionId in offline quiz sync: {}", qIdStr);
                    }
                }
            }

            if (answers.isEmpty()) {
                conflicts.add(new SyncResponse.Conflict("quizAttempt",
                        quizId.toString(), "Danh sách câu trả lời trống"));
                return false;
            }

            // Step 3: Submit for server-side grading
            quizAttemptUseCase.submitAttempt(attempt.getId(), answers);
            log.debug("Offline quiz attempt synced: student={}, quiz={}, attempt={}",
                    studentId, quizId, attempt.getId());
            return true;
        } catch (IllegalArgumentException | NoSuchElementException e) {
            log.warn("Quiz attempt sync validation failed: {}", e.getMessage());
            String quizIdStr = getString(payload, "quizId");
            conflicts.add(new SyncResponse.Conflict("quizAttempt",
                    quizIdStr != null ? quizIdStr : extractEntityId(op),
                    "Lỗi đồng bộ bài kiểm tra: " + e.getMessage()));
            return false;
        } catch (RuntimeException e) {
            log.error("Quiz attempt sync unexpected error: {}", e.getMessage(), e);
            String quizIdStr = getString(payload, "quizId");
            conflicts.add(new SyncResponse.Conflict("quizAttempt",
                    quizIdStr != null ? quizIdStr : extractEntityId(op),
                    "Lỗi đồng bộ bài kiểm tra: " + e.getMessage()));
            return false;
        }
    }

    // ─── Helpers ───────────────────────────────────────────────────────

    private SyncResponse.Conflict detectPublicationConflict(UUID studentId, SyncOperation op) {
        if (op == null || !requiresPublicationGuard(op.entityType())) {
            return null;
        }

        Optional<Enrollment> enrollment = resolveEnrollmentForSync(studentId, op);
        if (enrollment.isEmpty()) {
            return null;
        }

        LearningClass learningClass = enrollment.get().getLearningClass();
        if (learningClass == null || learningClass.getVersionMode() != LearningClass.VersionMode.PINNED) {
            return null;
        }

        UUID serverPublicationId = learningClass.getCourseVersionId();
        UUID clientPublicationId = parseUUID(op.publicationId());
        if (serverPublicationId == null || clientPublicationId == null) {
            return null;
        }

        if (serverPublicationId.equals(clientPublicationId)) {
            return null;
        }

        return conflict(
                op,
                op.entityType(),
                extractEntityId(op),
                "Goi ngoai tuyen da cu; vui long cap nhat khoa hoc truoc khi dong bo."
        );
    }

    private boolean requiresPublicationGuard(String entityType) {
        return "videoProgress".equals(entityType)
                || "progress".equals(entityType)
                || "quizAttempt".equals(entityType);
    }

    private Optional<Enrollment> resolveEnrollmentForSync(UUID studentId, SyncOperation op) {
        UUID courseId = parseUUID(op.courseId());
        if (courseId == null && op.payload() != null) {
            courseId = parseUUID(op.payload(), "courseId");
        }
        if (courseId != null) {
            Optional<Enrollment> enrollment = enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId);
            if (enrollment != null && enrollment.isPresent()) {
                return enrollment;
            }
        }

        if (op.payload() == null) {
            return Optional.empty();
        }

        UUID enrollmentId = parseUUID(op.payload(), "enrollmentId");
        if (enrollmentId == null) {
            return Optional.empty();
        }

        Optional<Enrollment> enrollment = enrollmentRepository.findById(enrollmentId);
        if (enrollment == null) {
            return Optional.empty();
        }

        return enrollment.filter(candidate -> studentId.equals(candidate.getStudentId()));
    }

    private String extractEntityId(SyncOperation op) {
        if (op.entityId() != null && !op.entityId().isBlank()) {
            return op.entityId();
        }
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

    private UUID parseUUID(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(raw);
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
