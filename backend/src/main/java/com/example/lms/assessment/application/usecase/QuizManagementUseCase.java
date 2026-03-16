package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Quiz;
import com.example.lms.assessment.domain.model.QuizId;
import com.example.lms.assessment.domain.repository.QuizRepository;
import com.example.lms.shared.exception.BusinessRuleException;
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
    public void addQuestionToQuiz(UUID quizId, UUID questionId, Integer displayOrder, UUID userId, String userRole) {
        log.info("Adding question {} to quiz {}", questionId, quizId);

        Quiz quiz = quizRepository.findById(QuizId.of(quizId))
                .orElseThrow(() -> new EntityNotFoundException("Quiz", quizId));

        validateTeacherOwnership(quiz, userId, userRole);
        quiz.addQuestion(questionId, displayOrder);

        quizRepository.save(quiz);
    }

    // Backward-compatible overload (no ownership check — for internal/admin use)
    @Transactional
    public void addQuestionToQuiz(UUID quizId, UUID questionId, Integer displayOrder) {
        log.info("Adding question {} to quiz {} (no ownership check)", questionId, quizId);

        Quiz quiz = quizRepository.findById(QuizId.of(quizId))
                .orElseThrow(() -> new EntityNotFoundException("Quiz", quizId));

        quiz.addQuestion(questionId, displayOrder);
        quizRepository.save(quiz);
    }

    @Transactional
    public void removeQuestionFromQuiz(UUID quizId, UUID questionId, UUID userId, String userRole) {
        log.info("Removing question {} from quiz {}", questionId, quizId);

        Quiz quiz = quizRepository.findById(QuizId.of(quizId))
                .orElseThrow(() -> new EntityNotFoundException("Quiz", quizId));

        validateTeacherOwnership(quiz, userId, userRole);
        quiz.removeQuestion(questionId);

        quizRepository.save(quiz);
    }

    @Transactional
    public void removeQuestionFromQuiz(UUID quizId, UUID questionId) {
        log.info("Removing question {} from quiz {} (no ownership check)", questionId, quizId);

        Quiz quiz = quizRepository.findById(QuizId.of(quizId))
                .orElseThrow(() -> new EntityNotFoundException("Quiz", quizId));

        quiz.removeQuestion(questionId);
        quizRepository.save(quiz);
    }

    @Transactional
    public void publishQuiz(UUID quizId, UUID userId, String userRole) {
        Quiz quiz = quizRepository.findById(QuizId.of(quizId))
                .orElseThrow(() -> new EntityNotFoundException("Quiz", quizId));

        validateTeacherOwnership(quiz, userId, userRole);
        quiz.publish();
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
    public void deleteQuiz(UUID quizId, UUID userId, String userRole) {
        Quiz quiz = quizRepository.findById(QuizId.of(quizId))
                .orElseThrow(() -> new EntityNotFoundException("Quiz", quizId));
        validateTeacherOwnership(quiz, userId, userRole);
        quizRepository.delete(quiz);
    }

    @Transactional
    public void deleteQuiz(UUID quizId) {
        Quiz quiz = quizRepository.findById(QuizId.of(quizId))
                .orElseThrow(() -> new EntityNotFoundException("Quiz", quizId));
        quizRepository.delete(quiz);
    }

    @Transactional
    public Quiz updateQuizSettings(
            UUID quizId,
            Quiz.QuizSettings newSettings,
            String title,
            Quiz.AssessmentType assessmentType,
            boolean countsTowardCertificate,
            UUID userId,
            String userRole) {
        Quiz quiz = quizRepository.findById(QuizId.of(quizId))
                .orElseThrow(() -> new EntityNotFoundException("Quiz", quizId));

        validateTeacherOwnership(quiz, userId, userRole);

        if (title != null && !title.isBlank()) {
            quiz.updateInfo(title, null);
        }
        quiz.updateSettings(newSettings);
        quiz.updateAssessmentMetadata(assessmentType != null ? assessmentType : quiz.getAssessmentType(), countsTowardCertificate);
        return quizRepository.save(quiz);
    }

    @Transactional
    public Quiz updateQuizSettings(
            UUID quizId,
            Quiz.QuizSettings newSettings,
            String title,
            Quiz.AssessmentType assessmentType,
            boolean countsTowardCertificate) {
        Quiz quiz = quizRepository.findById(QuizId.of(quizId))
                .orElseThrow(() -> new EntityNotFoundException("Quiz", quizId));

        if (title != null && !title.isBlank()) {
            quiz.updateInfo(title, null);
        }
        quiz.updateSettings(newSettings);
        quiz.updateAssessmentMetadata(assessmentType != null ? assessmentType : quiz.getAssessmentType(), countsTowardCertificate);
        return quizRepository.save(quiz);
    }

    // ============ Ownership Validation ============

    /**
     * Validates that the user has permission to modify this quiz.
     * ADMIN and ORG_ADMIN bypass ownership check (multi-tier admin pattern S43).
     * TEACHER must own the quiz via lesson→chapter→course→teacher_id chain.
     */
    private void validateTeacherOwnership(Quiz quiz, UUID userId, String userRole) {
        if (userId == null || userRole == null) return; // Internal calls without user context

        // ADMIN and ORG_ADMIN bypass ownership
        if ("ADMIN".equals(userRole) || "ORG_ADMIN".equals(userRole)
                || "ROLE_ADMIN".equals(userRole) || "ROLE_ORG_ADMIN".equals(userRole)) {
            return;
        }

        // TEACHER must own the quiz
        boolean owned = quizRepository.isOwnedByTeacher(quiz.getId(), userId);
        if (!owned) {
            throw new BusinessRuleException("QUIZ_OWNERSHIP_VIOLATION",
                    "Bạn không có quyền chỉnh sửa bài kiểm tra này");
        }
    }
}
