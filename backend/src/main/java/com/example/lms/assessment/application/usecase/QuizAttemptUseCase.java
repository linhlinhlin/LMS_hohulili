package com.example.lms.assessment.application.usecase;

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
    private final GradingService gradingService = new GradingService();

    @Transactional
    public QuizAttempt startAttempt(UUID quizId, UUID studentId) {
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

        // Check max attempts
        Integer maxAttempts = quiz.getSettings().maxAttempts();
        if (maxAttempts != null && maxAttempts > 0) {
            List<QuizAttempt> previousAttempts = attemptRepository.findByQuizIdAndStudentId(quizId, studentId);
            if (previousAttempts.size() >= maxAttempts) {
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

        // 3. Batch-fetch all questions (FIX N+1)
        List<UUID> questionIds = studentAnswers.stream()
                .map(QuizAttempt.AttemptAnswer::getQuestionId)
                .toList();
        Map<UUID, Question> questionMap = questionRepository.findAllByIds(questionIds).stream()
                .collect(Collectors.toMap(Question::getId, Function.identity()));

        // 4. Grade each answer using GradingStrategy dispatch
        double totalPoints = 0;
        double obtainedPoints = 0;
        boolean hasEssayQuestions = false;
        List<QuizAttempt.AttemptItem> gradedItems = new ArrayList<>();

        for (QuizAttempt.AttemptAnswer ans : studentAnswers) {
            UUID questionId = ans.getQuestionId();
            Question question = questionMap.get(questionId);

            if (question == null) {
                log.warn("Question {} not found during grading, skipping", questionId);
                continue;
            }

            // Get points override from QuizQuestion
            Integer pointsOverride = pointsMap.getOrDefault(questionId, 1);
            Map<String, Object> effectiveAnswer = ans.getEffectiveAnswer();

            // Dispatch to correct grading strategy
            GradingStrategy.GradeResult result = gradingService.grade(
                    question, effectiveAnswer, pointsOverride.doubleValue());

            if (question.getQuestionType() == Question.QuestionType.ESSAY) {
                hasEssayQuestions = true;
            }

            totalPoints += result.maxPoints();
            obtainedPoints += result.pointsEarned();

            // Build graded AttemptItem
            gradedItems.add(QuizAttempt.AttemptItem.builder()
                    .questionId(questionId)
                    .selectedOption(ans.getSelectedOption()) // legacy compat
                    .studentAnswer(effectiveAnswer)
                    .isCorrect(result.correct())
                    .pointsEarned(result.pointsEarned())
                    .build());
        }

        // 5. Replace items with graded results
        attempt.getItems().clear();
        attempt.getItems().addAll(gradedItems);

        // 6. Calculate final score and pass/fail
        double finalScore = (totalPoints > 0) ? (obtainedPoints / totalPoints) * 100.0 : 0.0;
        int passingScore = quiz.getSettings().passingScore() != null
                ? quiz.getSettings().passingScore()
                : 60;
        boolean passed = finalScore >= passingScore;

        attempt.finishGrading(finalScore, passed);

        QuizAttempt saved = attemptRepository.save(attempt);

        // Publish domain event for downstream consumers (gamification, analytics, Wiii)
        eventPublisher.publish(new QuizSubmittedEvent(
                saved.getId(),
                saved.getQuizId(),
                StudentId.of(saved.getStudentId()),
                quiz.getLessonId(),
                finalScore,
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

        double finalScore = (totalPoints > 0) ? (obtainedPoints / totalPoints) * 100.0 : 0.0;
        int passingScore = quiz.getSettings().passingScore() != null
                ? quiz.getSettings().passingScore() : 60;
        boolean passed = finalScore >= passingScore;

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
}
