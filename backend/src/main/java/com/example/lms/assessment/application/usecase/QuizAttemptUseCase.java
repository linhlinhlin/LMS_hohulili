package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.port.StudentAssessmentAccessPort;
import com.example.lms.assessment.domain.model.Question;
import com.example.lms.assessment.domain.event.QuizSubmittedEvent;
import com.example.lms.assessment.domain.model.Quiz;
import com.example.lms.assessment.domain.model.QuizAttempt;
import com.example.lms.assessment.domain.model.QuizId;
import com.example.lms.assessment.domain.model.QuizQuestion;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.assessment.domain.repository.QuizAttemptRepository;
import com.example.lms.assessment.domain.repository.QuizRepository;
import com.example.lms.assessment.domain.service.GradingService;
import com.example.lms.assessment.domain.service.GradingStrategy;
import com.example.lms.shared.domain.event.DomainEventPublisher;
import com.example.lms.shared.domain.valueobject.StudentId;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuizAttemptUseCase {

    private static final Logger log = LoggerFactory.getLogger(QuizAttemptUseCase.class);

    private final QuizRepository quizRepository;
    private final QuizAttemptRepository attemptRepository;
    private final QuestionRepository questionRepository;
    private final DomainEventPublisher eventPublisher;
    private final StudentAssessmentAccessPort studentAssessmentAccessPort;
    private final GradingService gradingService = new GradingService();

    @Transactional
    public QuizAttempt startAttempt(UUID quizId, UUID studentId) {
        return startAttempt(quizId, studentId, null);
    }

    @Transactional
    public QuizAttempt startAttempt(UUID quizId, UUID studentId, String accessPassword) {
        log.info("Student {} starting quiz {}", studentId, quizId);

        Quiz quiz = quizRepository.findById(QuizId.of(quizId))
                .orElseThrow(() -> new EntityNotFoundException("Quiz", quizId));

        if (!quiz.isPublished()) {
            throw new BusinessRuleException("QUIZ_NOT_PUBLISHED", "Quiz chưa được phát hành");
        }

        // Phase 6: Check availability window (Canvas SOTA pattern)
        Instant now = Instant.now();
        if (quiz.getSettings().availableFrom() != null && now.isBefore(quiz.getSettings().availableFrom())) {
            throw new BusinessRuleException("QUIZ_NOT_YET_AVAILABLE", "Bài kiểm tra chưa mở");
        }
        if (quiz.getSettings().lockAt() != null && now.isAfter(quiz.getSettings().lockAt())) {
            throw new BusinessRuleException("QUIZ_LOCKED", "Bài kiểm tra đã đóng");
        }

        // Access password validation (Canvas "access code" pattern)
        if (quiz.hasAccessPassword() && !quiz.validateAccessPassword(accessPassword)) {
            throw new BusinessRuleException("QUIZ_PASSWORD_REQUIRED", "Mật khẩu truy cập không đúng");
        }

        if (!studentAssessmentAccessPort.canAccessQuiz(quizId, studentId)) {
            throw new BusinessRuleException("QUIZ_ACCESS_DENIED", "Bạn không có quyền truy cập bài kiểm tra này");
        }

        // Check max attempts — only count completed (SUBMITTED/GRADED/TIMEOUT), not IN_PROGRESS
        Integer maxAttempts = quiz.getSettings().maxAttempts();
        if (maxAttempts != null && maxAttempts > 0) {
            long completedCount = attemptRepository.countCompletedByQuizIdAndStudentId(quizId, studentId);
            if (completedCount >= maxAttempts) {
                throw new BusinessRuleException("MAX_ATTEMPTS_REACHED",
                        "Bạn đã sử dụng hết " + maxAttempts + " lượt làm bài cho quiz này");
            }
        }

        // Extract question IDs from Quiz
        List<UUID> questionIds = quiz.getQuestions() != null
                ? quiz.getQuestions().stream().map(q -> q.getQuestionId()).collect(Collectors.toList())
                : Collections.emptyList();

        // Apply server-side question shuffle (Moodle/Canvas pattern)
        if (Boolean.TRUE.equals(quiz.getSettings().shuffleQuestions()) && questionIds.size() > 1) {
            Collections.shuffle(questionIds);
            log.debug("Shuffled {} questions for quiz {} (student {})", questionIds.size(), quizId, studentId);
        }

        QuizAttempt attempt = QuizAttempt.start(quizId, studentId, questionIds);
        return attemptRepository.save(attempt);
    }

    @Transactional
    public QuizAttempt submitAttempt(UUID attemptId, List<QuizAttempt.AttemptAnswer> studentAnswers) {
        log.info("Submitting attempt {}", attemptId);

        QuizAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new EntityNotFoundException("QuizAttempt", attemptId));

        if (attempt.getStatus() != QuizAttempt.AttemptStatus.IN_PROGRESS) {
             throw new IllegalStateException("Lần làm bài đã được nộp hoặc hết thời gian");
        }

        // 1. Submit to Domain (marks status as SUBMITTED)
        attempt.submit(studentAnswers, 0);

        // 2. Fetch Quiz for settings + points override
        Quiz quiz = quizRepository.findById(QuizId.of(attempt.getQuizId()))
                .orElseThrow(() -> new EntityNotFoundException("Quiz", attempt.getQuizId()));

        // 2a. Server-side timeout enforcement (60s grace period for network latency)
        Integer timeLimitMinutes = quiz.getSettings().timeLimitMinutes();
        if (timeLimitMinutes != null && timeLimitMinutes > 0 && attempt.getStartTime() != null) {
            long elapsedSeconds = Duration.between(attempt.getStartTime(), Instant.now()).getSeconds();
            long allowedSeconds = timeLimitMinutes * 60L + 60L; // 60s grace
            if (elapsedSeconds > allowedSeconds) {
                log.warn("Attempt {} exceeded time limit: {}s elapsed vs {}s allowed",
                        attemptId, elapsedSeconds, allowedSeconds);
                attempt.markTimeout();
                // Continue grading — give partial credit for submitted answers
            }
        }

        // Build points map from QuizQuestion (QuizQuestion.points overrides default 1.0)
        Map<UUID, Integer> pointsMap = new HashMap<>();
        if (quiz.getQuestions() != null) {
            quiz.getQuestions().forEach(qq -> pointsMap.put(qq.getQuestionId(), qq.getPoints()));
        }

        // 3. Batch-fetch ALL quiz questions (not just answered ones — unanswered count in denominator)
        List<UUID> allQuestionIds = quiz.getQuestions() != null
                ? quiz.getQuestions().stream().map(QuizQuestion::getQuestionId).collect(Collectors.toList())
                : Collections.emptyList();
        Map<UUID, Question> questionMap = questionRepository.findAllByIds(allQuestionIds).stream()
                .collect(Collectors.toMap(Question::getId, Function.identity()));

        // Build lookup for student answers by questionId
        Map<UUID, QuizAttempt.AttemptAnswer> answerMap = studentAnswers.stream()
                .collect(Collectors.toMap(QuizAttempt.AttemptAnswer::getQuestionId, Function.identity(), (a, b) -> a));

        // 4. Grade ALL questions — unanswered get 0 points but count in denominator
        double totalPoints = 0;
        double obtainedPoints = 0;
        boolean hasEssayQuestions = false;
        List<QuizAttempt.AttemptItem> gradedItems = new ArrayList<>();

        List<QuizQuestion> quizQuestions = quiz.getQuestions() != null ? quiz.getQuestions() : Collections.emptyList();
        for (QuizQuestion quizQuestion : quizQuestions) {
            UUID questionId = quizQuestion.getQuestionId();
            Question question = questionMap.get(questionId);

            if (question == null) {
                log.warn("Question {} not found during grading, skipping", questionId);
                continue;
            }

            int questionMaxPoints = pointsMap.getOrDefault(questionId, 1);
            totalPoints += questionMaxPoints;

            QuizAttempt.AttemptAnswer ans = answerMap.get(questionId);

            // Resolve effective correct option — mirrors SingleChoiceGradingStrategy.resolveCorrectOption():
            // prefer answerKey.correctOption (new format) over legacy correctOption field.
            String effectiveCorrectOption = (question.getAnswerKey() != null
                    && question.getAnswerKey().containsKey("correctOption"))
                    ? String.valueOf(question.getAnswerKey().get("correctOption"))
                    : question.getCorrectOption();

            // Resolve correct options for MULTIPLE_CHOICE — mirrors MultipleChoiceGradingStrategy.resolveCorrectOptions()
            List<String> effectiveCorrectOptions = null;
            if (question.getQuestionType() == Question.QuestionType.MULTIPLE_CHOICE) {
                if (question.getAnswerKey() != null && question.getAnswerKey().containsKey("correctOptions")) {
                    Object val = question.getAnswerKey().get("correctOptions");
                    if (val instanceof List) {
                        @SuppressWarnings("unchecked")
                        List<Object> rawList = (List<Object>) val;
                        effectiveCorrectOptions = rawList.stream()
                                .map(o -> String.valueOf(o).toUpperCase())
                                .collect(Collectors.toList());
                    }
                } else if (question.getCorrectOption() != null) {
                    effectiveCorrectOptions = Arrays.stream(question.getCorrectOption().split(","))
                            .map(s -> s.trim().toUpperCase())
                            .collect(Collectors.toList());
                }
            }

            if (ans != null) {
                // Student answered — grade it
                Map<String, Object> effectiveAnswer = ans.getEffectiveAnswer();
                GradingStrategy.GradeResult result = gradingService.grade(
                        question, effectiveAnswer, (double) questionMaxPoints);

                if (question.getQuestionType() == Question.QuestionType.ESSAY) {
                    hasEssayQuestions = true;
                }

                obtainedPoints += result.pointsEarned();

                gradedItems.add(QuizAttempt.AttemptItem.builder()
                        .questionId(questionId)
                        .selectedOption(ans.getSelectedOption())
                        .studentAnswer(effectiveAnswer)
                        .isCorrect(result.correct())
                        .pointsEarned(result.pointsEarned())
                        .correctOption(effectiveCorrectOption)
                        .correctOptions(effectiveCorrectOptions)
                        .build());
            } else {
                // Unanswered — 0 points, marked incorrect
                gradedItems.add(QuizAttempt.AttemptItem.builder()
                        .questionId(questionId)
                        .selectedOption(null)
                        .studentAnswer(null)
                        .isCorrect(false)
                        .pointsEarned(0.0)
                        .correctOption(effectiveCorrectOption)
                        .correctOptions(effectiveCorrectOptions)
                        .build());
            }
        }

        // 5. Replace items with graded results
        attempt.getItems().clear();
        attempt.getItems().addAll(gradedItems);

        // 6. Calculate score on configurable scale (Moodle "Maximum grade" pattern), rounded to 2 decimal places
        double maxScale = quiz.getSettings().maxScoreScale() != null ? quiz.getSettings().maxScoreScale() : 10.0;
        double scoreOnScale = (totalPoints > 0) ? (obtainedPoints / totalPoints) * maxScale : 0.0;
        scoreOnScale = Math.round(scoreOnScale * 100.0) / 100.0;

        int passingScorePercent = quiz.getSettings().passingScore() != null
                ? quiz.getSettings().passingScore()
                : 60;
        double passingThreshold = (passingScorePercent / 100.0) * maxScale;
        boolean passed = scoreOnScale >= passingThreshold;

        attempt.setMaxScore(maxScale);
        attempt.finishGrading(scoreOnScale, passed);

        QuizAttempt saved = attemptRepository.save(attempt);

        // Publish domain event for downstream consumers (gamification, analytics, Wiii)
        eventPublisher.publish(new QuizSubmittedEvent(
                saved.getId(),
                saved.getQuizId(),
                StudentId.of(saved.getStudentId()),
                quiz.getLessonId(),
                scoreOnScale,
                passed
        ));

        return saved;
    }

    @Transactional(readOnly = true)
    public QuizAttempt getAttemptResult(UUID attemptId, UUID userId, String userRole) {
        QuizAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new EntityNotFoundException("QuizAttempt", attemptId));

        // Students can only view their own attempts
        if (isStudentRole(userRole) && !attempt.getStudentId().equals(userId)) {
            throw new BusinessRuleException("ATTEMPT_OWNERSHIP_VIOLATION",
                    "Bạn chỉ có thể xem bài làm của mình");
        }

        return attempt;
    }

    // ============ Phase 2: Manual Grading (Essay questions) ============

    /**
     * Manually grade a single question in an attempt (Canvas SOTA: PUT /submissions/:id/questions/:qid).
     * Used by teachers to grade essay questions and override auto-graded scores.
     */
    @Transactional
    public QuizAttempt manualGrade(UUID attemptId, UUID questionId, double score, String feedback,
                                   UUID userId, String userRole) {
        log.info("Manual grading attempt {} question {} with score {}", attemptId, questionId, score);

        QuizAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new EntityNotFoundException("QuizAttempt", attemptId));

        // Validate teacher owns this quiz (ADMIN/ORG_ADMIN bypass)
        Quiz quiz = quizRepository.findById(QuizId.of(attempt.getQuizId()))
                .orElseThrow(() -> new EntityNotFoundException("Quiz", attempt.getQuizId()));
        validateGradingPermission(quiz, userId, userRole);

        // Find the item to grade
        QuizAttempt.AttemptItem targetItem = attempt.getItems().stream()
                .filter(item -> questionId.equals(item.getQuestionId()))
                .findFirst()
                .orElseThrow(() -> new BusinessRuleException("QUESTION_NOT_IN_ATTEMPT",
                        "Câu hỏi không thuộc lần làm bài này"));

        // Update the item
        targetItem.setPointsEarned(score);
        targetItem.setIsCorrect(score > 0);
        if (feedback != null) {
            targetItem.setFeedback(feedback);
        }

        // Recalculate total score — quiz already fetched above for ownership validation
        // Build points map for max points per question
        Map<UUID, Integer> pointsMap = new HashMap<>();
        if (quiz.getQuestions() != null) {
            quiz.getQuestions().forEach(qq -> pointsMap.put(qq.getQuestionId(), qq.getPoints()));
        }

        double totalPoints = 0;
        double obtainedPoints = 0;
        for (QuizAttempt.AttemptItem item : attempt.getItems()) {
            int maxPts = pointsMap.getOrDefault(item.getQuestionId(), 1);
            totalPoints += maxPts;
            obtainedPoints += (item.getPointsEarned() != null ? item.getPointsEarned() : 0);
        }

        double maxScale = quiz.getSettings().maxScoreScale() != null ? quiz.getSettings().maxScoreScale() : 10.0;
        double finalScore = (totalPoints > 0) ? (obtainedPoints / totalPoints) * maxScale : 0.0;
        int passingScore = quiz.getSettings().passingScore() != null
                ? quiz.getSettings().passingScore() : 60;
        double passingThreshold = (passingScore / 100.0) * maxScale;
        boolean passed = finalScore >= passingThreshold;

        attempt.setMaxScore(maxScale);
        attempt.finishGrading(finalScore, passed);

        return attemptRepository.save(attempt);
    }

    // ============ Security Helpers ============

    private boolean isStudentRole(String role) {
        return "STUDENT".equals(role) || "ROLE_STUDENT".equals(role);
    }

    private boolean isAdminRole(String role) {
        return role != null && (role.contains("ADMIN") || role.contains("ORG_ADMIN"));
    }

    private void validateGradingPermission(Quiz quiz, UUID userId, String userRole) {
        if (userId == null || userRole == null) return;
        if (isAdminRole(userRole)) return;
        boolean owned = quizRepository.isOwnedByTeacher(quiz.getId(), userId);
        if (!owned) {
            throw new BusinessRuleException("QUIZ_OWNERSHIP_VIOLATION",
                    "Bạn không có quyền chấm bài kiểm tra này");
        }
    }

    // ============ Teacher Moderation: Delete Attempt (Canvas "Moderate This Quiz") ============

    /**
     * Teacher deletes a student's attempt — frees up the attempt slot so student can retake.
     */
    @Transactional
    public void deleteAttempt(UUID attemptId, UUID teacherId, String teacherRole) {
        QuizAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new EntityNotFoundException("QuizAttempt", attemptId));

        Quiz quiz = quizRepository.findById(QuizId.of(attempt.getQuizId()))
                .orElseThrow(() -> new EntityNotFoundException("Quiz", attempt.getQuizId()));

        validateGradingPermission(quiz, teacherId, teacherRole);

        log.info("Teacher {} deleting attempt {} for student {} on quiz {}",
                teacherId, attemptId, attempt.getStudentId(), attempt.getQuizId());

        attemptRepository.deleteById(attemptId);
    }

    // ============ Phase 4: Auto-Save (Moodle SOTA: process_actions per 60s) ============

    /**
     * Save partial answers during an in-progress attempt without finalizing.
     * Preserves existing answers and merges new ones.
     */
    @Transactional
    public QuizAttempt saveProgress(UUID attemptId, UUID studentId, List<QuizAttempt.AttemptAnswer> partialAnswers) {
        log.debug("Auto-saving progress for attempt {}", attemptId);

        QuizAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new EntityNotFoundException("QuizAttempt", attemptId));

        if (attempt.getStatus() != QuizAttempt.AttemptStatus.IN_PROGRESS) {
            throw new BusinessRuleException("ATTEMPT_NOT_IN_PROGRESS",
                    "Không thể lưu bài làm đã nộp");
        }

        // Verify ownership
        if (!attempt.getStudentId().equals(studentId)) {
            throw new BusinessRuleException("ATTEMPT_OWNERSHIP_VIOLATION",
                    "Bạn không có quyền lưu bài làm này");
        }

        // Merge answers: update existing items or add new ones
        Map<UUID, QuizAttempt.AttemptItem> existingMap = new HashMap<>();
        for (QuizAttempt.AttemptItem item : attempt.getItems()) {
            existingMap.put(item.getQuestionId(), item);
        }

        for (QuizAttempt.AttemptAnswer ans : partialAnswers) {
            Map<String, Object> effectiveAnswer = ans.getEffectiveAnswer();
            if (existingMap.containsKey(ans.getQuestionId())) {
                // Update existing: just replace the answer, don't grade yet
                // We need to rebuild the item since AttemptItem is mostly immutable
                QuizAttempt.AttemptItem existing = existingMap.get(ans.getQuestionId());
                QuizAttempt.AttemptItem updated = QuizAttempt.AttemptItem.builder()
                        .questionId(ans.getQuestionId())
                        .selectedOption(ans.getSelectedOption())
                        .studentAnswer(effectiveAnswer)
                        .isCorrect(existing.getIsCorrect())
                        .pointsEarned(existing.getPointsEarned())
                        .feedback(existing.getFeedback())
                        .build();
                existingMap.put(ans.getQuestionId(), updated);
            } else {
                // New answer for a question
                existingMap.put(ans.getQuestionId(), QuizAttempt.AttemptItem.builder()
                        .questionId(ans.getQuestionId())
                        .selectedOption(ans.getSelectedOption())
                        .studentAnswer(effectiveAnswer)
                        .build());
            }
        }

        // Replace items list
        attempt.getItems().clear();
        attempt.getItems().addAll(existingMap.values());

        return attemptRepository.save(attempt);
    }

    // ============ Phase 5: Preflight (Canvas SOTA: confirmation + resume) ============

    /**
     * Get quiz preflight info for the confirmation screen.
     * Returns quiz metadata, attempts remaining, and in-progress attempt for resume.
     * Auto-expires stale IN_PROGRESS attempts that exceeded time limit.
     */
    @Transactional
    public Map<String, Object> getQuizPreflight(UUID quizId, UUID studentId) {
        Quiz quiz = quizRepository.findById(QuizId.of(quizId))
                .orElseThrow(() -> new EntityNotFoundException("Quiz", quizId));

        // Find in-progress attempt (for resume)
        Optional<QuizAttempt> inProgress = attemptRepository
                .findInProgressByQuizIdAndStudentId(quizId, studentId);

        // Auto-expire if server time exceeded (cleanup stale IN_PROGRESS)
        // Checks both timeLimitMinutes AND lockAt — whichever fires first
        if (inProgress.isPresent()) {
            QuizAttempt attempt = inProgress.get();
            Instant now = Instant.now();
            boolean expired = false;

            // Hard deadline: lockAt passed — always force-expire regardless of time limit
            Instant lockAt = quiz.getSettings().lockAt();
            if (lockAt != null && now.isAfter(lockAt)) {
                log.info("Auto-expiring attempt {} for quiz {} — lockAt {} passed",
                        attempt.getId(), quizId, lockAt);
                expired = true;
            }

            // Time limit expired (+ 60s grace for network latency)
            if (!expired) {
                Integer timeLimit = quiz.getSettings().timeLimitMinutes();
                if (timeLimit != null && timeLimit > 0 && attempt.getStartTime() != null) {
                    long elapsed = Duration.between(attempt.getStartTime(), now).getSeconds();
                    long allowed = timeLimit * 60L + 60L;
                    if (elapsed > allowed) {
                        log.info("Auto-expiring stale attempt {} for quiz {} ({}s elapsed, {}s allowed)",
                                attempt.getId(), quizId, elapsed, allowed);
                        expired = true;
                    }
                }
            }

            if (expired) {
                attempt.markTimeout();
                attemptRepository.save(attempt);
                inProgress = Optional.empty();
            }
        }

        long completedCount = attemptRepository.countCompletedByQuizIdAndStudentId(quizId, studentId);
        Integer maxAttempts = quiz.getSettings().maxAttempts();

        Instant now = Instant.now();
        Instant lockAt = quiz.getSettings().lockAt();
        Instant availableFrom = quiz.getSettings().availableFrom();
        Instant dueAt = quiz.getSettings().dueAt();
        Integer timeLimitMinutes = quiz.getSettings().timeLimitMinutes();

        Map<String, Object> result = new HashMap<>();
        result.put("quizId", quizId.toString());
        result.put("quizTitle", quiz.getTitle());
        result.put("description", quiz.getDescription());
        result.put("timeLimitMinutes", timeLimitMinutes);
        result.put("maxAttempts", maxAttempts);
        result.put("passingScore", quiz.getSettings().passingScore());
        result.put("maxScoreScale", quiz.getSettings().maxScoreScale() != null ? quiz.getSettings().maxScoreScale() : 10.0);
        result.put("questionCount", quiz.getQuestions() != null ? quiz.getQuestions().size() : 0);
        result.put("completedAttempts", completedCount);
        result.put("attemptsRemaining", maxAttempts != null && maxAttempts > 0
                ? Math.max(0, maxAttempts - completedCount) : null);
        result.put("requiresPassword", quiz.hasAccessPassword());
        result.put("shuffleQuestions", quiz.getSettings().shuffleQuestions());
        result.put("shuffleOptions", quiz.getSettings().shuffleOptions());

        // Canvas SOTA: expose schedule dates so client can show deadlines + enforce lockAt
        result.put("availableFrom", availableFrom != null ? availableFrom.toString() : null);
        result.put("dueAt", dueAt != null ? dueAt.toString() : null);
        result.put("lockAt", lockAt != null ? lockAt.toString() : null);

        // Effective time limit for a NEW attempt: min(timeLimitMinutes*60, secondsUntilLockAt)
        // Client uses this to initialize the countdown for fresh starts
        if (timeLimitMinutes != null && timeLimitMinutes > 0) {
            long timeLimitSeconds = timeLimitMinutes * 60L;
            if (lockAt != null) {
                long secondsUntilLock = Math.max(0, Duration.between(now, lockAt).getSeconds());
                result.put("effectiveTimeLimitSeconds", Math.min(timeLimitSeconds, secondsUntilLock));
            } else {
                result.put("effectiveTimeLimitSeconds", timeLimitSeconds);
            }
        } else if (lockAt != null) {
            // No per-attempt time limit, but lockAt creates an effective deadline
            long secondsUntilLock = Math.max(0, Duration.between(now, lockAt).getSeconds());
            result.put("effectiveTimeLimitSeconds", secondsUntilLock);
        } else {
            result.put("effectiveTimeLimitSeconds", null);
        }

        // Resume info
        if (inProgress.isPresent()) {
            QuizAttempt attempt = inProgress.get();
            Map<String, Object> resumeInfo = new HashMap<>();
            resumeInfo.put("attemptId", attempt.getId().toString());
            resumeInfo.put("startedAt", attempt.getStartTime() != null ? attempt.getStartTime().toString() : null);

            // Server-calculated time remaining — min(timeLimitRemaining, secondsUntilLockAt)
            if (timeLimitMinutes != null && timeLimitMinutes > 0 && attempt.getStartTime() != null) {
                long elapsed = Duration.between(attempt.getStartTime(), now).getSeconds();
                long timeLimitBasedRemaining = Math.max(0, timeLimitMinutes * 60L - elapsed);
                if (lockAt != null) {
                    long secondsUntilLock = Math.max(0, Duration.between(now, lockAt).getSeconds());
                    resumeInfo.put("timeRemainingSeconds", Math.min(timeLimitBasedRemaining, secondsUntilLock));
                } else {
                    resumeInfo.put("timeRemainingSeconds", timeLimitBasedRemaining);
                }
            } else if (lockAt != null) {
                // No per-attempt time limit — lockAt is the only deadline
                long secondsUntilLock = Math.max(0, Duration.between(now, lockAt).getSeconds());
                resumeInfo.put("timeRemainingSeconds", secondsUntilLock);
            }

            // Saved answers for restore
            List<Map<String, Object>> savedAnswers = attempt.getItems().stream()
                    .filter(item -> item.getSelectedOption() != null || item.getStudentAnswer() != null)
                    .map(item -> {
                        Map<String, Object> ans = new HashMap<>();
                        ans.put("questionId", item.getQuestionId().toString());
                        ans.put("selectedOption", item.getSelectedOption());
                        ans.put("studentAnswer", item.getStudentAnswer());
                        return ans;
                    }).toList();
            resumeInfo.put("savedAnswers", savedAnswers);
            resumeInfo.put("answeredCount", savedAnswers.size());

            result.put("inProgressAttempt", resumeInfo);
        } else {
            result.put("inProgressAttempt", null);
        }

        return result;
    }
}
