package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Question;
import com.example.lms.assessment.domain.model.Quiz;
import com.example.lms.assessment.domain.model.QuizAttempt;
import com.example.lms.assessment.domain.model.QuizId;
import com.example.lms.assessment.domain.model.QuizQuestion;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.assessment.domain.repository.QuizAttemptRepository;
import com.example.lms.assessment.domain.repository.QuizRepository;
import com.example.lms.assessment.domain.service.GradingService;
import com.example.lms.assessment.domain.service.GradingStrategy;
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
    private final GradingService gradingService = new GradingService();

    @Transactional
    public QuizAttempt startAttempt(UUID quizId, UUID studentId) {
        log.info("Student {} starting quiz {}", studentId, quizId);
        
        Quiz quiz = quizRepository.findById(QuizId.of(quizId))
                .orElseThrow(() -> new EntityNotFoundException("Quiz", quizId));

        if (!quiz.isPublished()) {
            throw new BusinessRuleException("QUIZ_NOT_PUBLISHED", "Quiz chưa được phát hành");
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
             throw new IllegalStateException("Attempt is already submitted or timed out");
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
        boolean passed = !hasEssayQuestions && finalScore >= passingScore;

        attempt.finishGrading(finalScore, passed);

        return attemptRepository.save(attempt);
    }
    
    @Transactional(readOnly = true)
    public QuizAttempt getAttemptResult(UUID attemptId) {
        return attemptRepository.findById(attemptId)
                .orElseThrow(() -> new EntityNotFoundException("QuizAttempt", attemptId));
    }
}
