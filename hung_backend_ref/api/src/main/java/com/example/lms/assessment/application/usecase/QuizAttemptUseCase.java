package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Question;
import com.example.lms.assessment.domain.model.Quiz;
import com.example.lms.assessment.domain.model.QuizAttempt;
import com.example.lms.assessment.domain.model.QuizId;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.assessment.domain.repository.QuizAttemptRepository;
import com.example.lms.assessment.domain.repository.QuizRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuizAttemptUseCase {

    private static final Logger log = LoggerFactory.getLogger(QuizAttemptUseCase.class);

    private final QuizRepository quizRepository;
    private final QuizAttemptRepository attemptRepository;
    private final QuestionRepository questionRepository;

    @Transactional
    public QuizAttempt startAttempt(UUID quizId, UUID studentId) {
        log.info("Student {} starting quiz {}", studentId, quizId);
        
        Quiz quiz = quizRepository.findById(QuizId.of(quizId))
                .orElseThrow(() -> new RuntimeException("Quiz not found: " + quizId));
        
        if (!quiz.isPublished()) {
            throw new RuntimeException("Quiz is not published");
        }
        
        // TODO: Check max attempts, time, etc.
        
        // Helper: Extract question IDs from Quiz
        List<UUID> questionIds = quiz.getQuestions() != null 
                ? quiz.getQuestions().stream().map(q -> q.getQuestionId()).collect(Collectors.toList())
                : Collections.emptyList();

        QuizAttempt attempt = QuizAttempt.start(quizId, studentId, questionIds);
        return attemptRepository.save(attempt);
    }

    @Transactional
    public QuizAttempt submitAttempt(UUID attemptId, List<QuizAttempt.AttemptAnswer> studentAnswers) {
        log.info("Submitting attempt {}", attemptId);
        
        QuizAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));
        
        if (attempt.getStatus() != QuizAttempt.AttemptStatus.IN_PROGRESS) {
             throw new IllegalStateException("Attempt is already submitted or timed out");
        }
        
        // 1. Submit to Domain
        //    (Just marks status essentially, logic moved here for simplicity or Domain Svc)
        attempt.submit(studentAnswers, 0); // passingScore is unchecked in submit currently

        // 2. Grading Logic
        double totalPoints = 0;
        double obtainedPoints = 0;
        
        // Fetch Questions to Check Answers
        // Optimization: Fetch all needed questions in batch if possible. 
        // For now, simple loop (N+1 but safer than complex query for now).
        // Ideally: questionRepository.findAllById(questionIds)
        
        for (QuizAttempt.AttemptAnswer ans : studentAnswers) {
             UUID questionId = ans.getQuestionId();
             Question question = questionRepository.findById(questionId).orElse(null);
             
             if (question != null) {
                 // Assume standard point=1 for all questions for now, or fetch from QuizQuestion logic
                 // But QuizQuestion has points override. We need Quiz context to get points too!
                 // Complexity: Points are in Quiz AR -> QuizQuestion. Question Entity has content.
                 // Correct logic:
                 // 1. Get Points from QuizQuestion (via Quiz).
                 // 2. Get CorrectAnswer from Question Entity.
                 
                 // Needed: Quiz Link.
                 // Attempt has quizId.
                 
                 boolean isCorrect = question.getCorrectOption() != null && 
                                     question.getCorrectOption().equalsIgnoreCase(ans.getSelectedOption());
                                     
                 if (isCorrect) {
                     obtainedPoints += 1.0; // Default 1 point
                 }
                 totalPoints += 1.0;
                 
                 // Update AttemptItem in attempt to store correctness?
                 // Current Domain Model `AttemptItem` has `isCorrect`.
                 // But `attempt.submit` didn't populate items fully updates.
                 // We need to update existing items in attempt.items list.
                 
                 attempt.getItems().stream()
                     .filter(i -> i.getQuestionId().equals(questionId))
                     .findFirst()
                     .ifPresent(item -> {
                         // We need a setter or reconstruction. 
                         // AttemptItem is ValueObject-like but Mutable? 
                         // Lombok @Builder used. 
                         // It's defined as: class AttemptItem { selectedOption, isCorrect }
                         // Using reflection or rebuild?
                         // In DDD, we should replace the item.
                     });
             }
        }
        
        // 3. Finalize
        double finalScore = (totalPoints > 0) ? (obtainedPoints / totalPoints) * 100.0 : 0.0;
        boolean passed = finalScore >= 60; // Fetch from Quiz Settings in real impl
        
        attempt.finishGrading(finalScore, passed);
        
        return attemptRepository.save(attempt);
    }
    
    @Transactional(readOnly = true)
    public QuizAttempt getAttemptResult(UUID attemptId) {
        return attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));
    }
}
