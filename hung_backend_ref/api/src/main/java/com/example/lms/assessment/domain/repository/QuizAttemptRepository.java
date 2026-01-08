package com.example.lms.assessment.domain.repository;

import com.example.lms.assessment.domain.model.QuizAttempt;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuizAttemptRepository {
    QuizAttempt save(QuizAttempt attempt);
    Optional<QuizAttempt> findById(UUID id);
    List<QuizAttempt> findByQuizIdAndStudentId(UUID quizId, UUID studentId);
    List<QuizAttempt> findByQuizId(UUID quizId);
}
