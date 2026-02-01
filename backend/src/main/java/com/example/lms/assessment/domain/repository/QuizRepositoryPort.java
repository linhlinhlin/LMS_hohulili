package com.example.lms.assessment.domain.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain repository port for Quiz aggregate.
 */
public interface QuizRepositoryPort {

    UUID save(UUID lessonId, String title, String description, Integer timeLimitMinutes, Integer passingScore);

    Optional<Object> findById(UUID id);

    List<Object> findByLessonId(UUID lessonId);

    void publish(UUID id);

    void archive(UUID id);

    void deleteById(UUID id);
}
