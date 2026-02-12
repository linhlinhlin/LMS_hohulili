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

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QuizManagementUseCase {

    private static final Logger log = LoggerFactory.getLogger(QuizManagementUseCase.class);

    private final QuizRepository quizRepository;

    // ============ Read Operations ============

    @Transactional(readOnly = true)
    public Quiz getQuizById(UUID quizId) {
        return quizRepository.findById(QuizId.of(quizId))
                .orElseThrow(() -> new EntityNotFoundException("Quiz", quizId));
    }

    @Transactional(readOnly = true)
    public List<Quiz> getQuizzesByLesson(UUID lessonId) {
        return quizRepository.findByLessonId(lessonId);
    }

    // ============ Write Operations ============

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

    @Transactional
    public Quiz updateQuizSettings(UUID quizId, Quiz.QuizSettings newSettings, String title) {
        Quiz quiz = quizRepository.findById(QuizId.of(quizId))
                .orElseThrow(() -> new EntityNotFoundException("Quiz", quizId));

        if (title != null && !title.isBlank()) {
            quiz.updateInfo(title, null);
        }
        quiz.updateSettings(newSettings);
        return quizRepository.save(quiz);
    }
}
