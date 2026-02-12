package com.example.lms.assessment.domain.repository;

import com.example.lms.assessment.domain.model.Rubric;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Port interface for Rubric persistence.
 */
public interface RubricRepository {
    Rubric save(Rubric rubric);
    Optional<Rubric> findById(UUID id);
    List<Rubric> findByTeacherId(UUID teacherId);
    Optional<Rubric> findByAssignmentId(UUID assignmentId);
    void deleteById(UUID id);
}
