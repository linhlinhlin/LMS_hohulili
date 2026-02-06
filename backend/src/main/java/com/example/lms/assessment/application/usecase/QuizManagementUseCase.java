package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Quiz;
import com.example.lms.assessment.domain.model.QuizId;
import com.example.lms.assessment.domain.repository.QuizRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QuizManagementUseCase {

    private static final Logger log = LoggerFactory.getLogger(QuizManagementUseCase.class);

    private final QuizRepository quizRepository;

    @Transactional
    public void addQuestionToQuiz(UUID quizId, UUID questionId, Integer displayOrder) {
        log.info("Adding question {} to quiz {}", questionId, quizId);
        
        Quiz quiz = quizRepository.findById(QuizId.of(quizId))
                .orElseThrow(() -> new EntityNotFoundException("Quiz", quizId));

        quiz.addQuestion(questionId, displayOrder);
        
        quizRepository.save(quiz);
    }

    @Transactional
    public void removeQuestionFromQuiz(UUID quizId, UUID questionId) {
        log.info("Removing question {} from quiz {}", questionId, quizId);
        
        Quiz quiz = quizRepository.findById(QuizId.of(quizId))
                .orElseThrow(() -> new EntityNotFoundException("Quiz", quizId));

        quiz.removeQuestion(questionId);
        
        quizRepository.save(quiz);
    }
    
    @Transactional
    public void publishQuiz(UUID quizId) {
        Quiz quiz = quizRepository.findById(QuizId.of(quizId))
                .orElseThrow(() -> new EntityNotFoundException("Quiz", quizId));
        
        quiz.publish();
        quizRepository.save(quiz);
    }
}
