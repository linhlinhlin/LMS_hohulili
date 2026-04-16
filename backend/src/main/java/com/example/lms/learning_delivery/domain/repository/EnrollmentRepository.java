package com.example.lms.learning_delivery.domain.repository;

import com.example.lms.learning_delivery.domain.model.Enrollment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Enrollment aggregate.
 */
public interface EnrollmentRepository {

    /**
     * Save an enrollment.
     */
    Enrollment save(Enrollment enrollment);

    /**
     * Find enrollment by ID.
     */
    Optional<Enrollment> findById(UUID id);

    /**
     * Find enrollment by student and class.
     */
    Optional<Enrollment> findByStudentIdAndClassId(UUID studentId, UUID classId);

    /**
     * Check if student is enrolled in a class.
     */
    boolean existsByStudentIdAndClassId(UUID studentId, UUID classId);

    /**
     * Find all enrollments for a student.
     */
    List<Enrollment> findByStudentId(UUID studentId);

    /**
     * Find all enrollments for a class.
     */
    Page<Enrollment> findByClassId(UUID classId, Pageable pageable);

    /**
     * Find active enrollments for a student.
     */
    List<Enrollment> findActiveByStudentId(UUID studentId);

    /**
     * Count enrollments in a class (all statuses).
     */
    long countByClassId(UUID classId);

    /**
     * Count only ACTIVE enrollments in a class.
     * Used for deletion checks — DROPPED students should not block class deletion.
     */
    long countActiveByClassId(UUID classId);

    /**
     * Find enrollment by student and course.
     */
    Optional<Enrollment> findByStudentIdAndCourseId(UUID studentId, UUID courseId);

    /**
     * Delete an enrollment.
     */
    void delete(Enrollment enrollment);

    /**
     * Check if any enrollment exists for a course (across all classes).
     */
    boolean existsByCourseId(UUID courseId);
}
