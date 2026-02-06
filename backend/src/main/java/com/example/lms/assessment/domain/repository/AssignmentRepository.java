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
     * Delete an assignment by ID with all related entities (cascade).
     * This includes: submissions, rubrics, attachments, lesson links, allocations.
     */
    void deleteByIdWithCascade(AssignmentId id);

    /**
     * Check if assignment exists.
     */
    boolean existsById(AssignmentId id);

    /**
     * Find all assignments for a course.
     */
    List<Assignment> findByCourseId(java.util.UUID courseId);

    /**
     * Find all assignments for multiple courses.
     */
    List<Assignment> findByCourseIdIn(List<java.util.UUID> courseIds);

    /**
     * Allocate an assignment with a distribution strategy and optional student list.
     *
     * @param assignmentId     the assignment to allocate
     * @param distributionType e.g. "ALL_STUDENTS", "SPECIFIC_STUDENTS"
     * @param studentIds       list of student IDs (used when distributionType is "SPECIFIC_STUDENTS")
     */
    void allocate(UUID assignmentId, String distributionType, List<UUID> studentIds);
}
