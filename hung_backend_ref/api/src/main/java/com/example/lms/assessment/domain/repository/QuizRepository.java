package com.example.lms.assessment.domain.repository;

import com.example.lms.assessment.domain.model.Quiz;
import com.example.lms.assessment.domain.model.QuizId;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Quiz aggregate.
 * Domain layer port - implementations in infrastructure layer.
 */
public interface QuizRepository {

    /**
     * Save a quiz.
     */
    Quiz save(Quiz quiz);

    /**
     * Find quiz by ID.
     */
    Optional<Quiz> findById(QuizId id);

    /**
     * Find all quizzes for a lesson.
     */
    List<Quiz> findByLessonId(UUID lessonId);

    /**
     * Delete a quiz.
     */
    void delete(Quiz quiz);

    /**
     * Check if quiz exists.
     */
    boolean existsById(QuizId id);
}
