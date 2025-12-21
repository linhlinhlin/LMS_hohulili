package com.example.lms.assessment.domain.repository;

import com.example.lms.assessment.domain.model.Assignment;
import com.example.lms.assessment.domain.model.AssignmentId;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Assignment aggregate.
 * Domain layer port - implementations in infrastructure layer.
 */
public interface AssignmentRepository {

    /**
     * Save an assignment.
     */
    Assignment save(Assignment assignment);

    /**
     * Find assignment by ID.
     */
    Optional<Assignment> findById(AssignmentId id);

    /**
     * Find all assignments for a lesson.
     */
    List<Assignment> findByLessonId(UUID lessonId);

    /**
     * Delete an assignment.
     */
    void delete(Assignment assignment);

    /**
     * Check if assignment exists.
     */
    boolean existsById(AssignmentId id);
}
