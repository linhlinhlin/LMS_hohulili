package com.example.lms.assessment.domain.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain repository port for Assignment aggregate.
 */
public interface AssignmentRepositoryPort {

    UUID save(UUID lessonId, UUID courseId, String title, String description);

    Optional<Object> findById(UUID id);

    List<Object> findByLessonId(UUID lessonId);

    List<Object> findByCourseId(UUID courseId);

    void deleteById(UUID id);
}
