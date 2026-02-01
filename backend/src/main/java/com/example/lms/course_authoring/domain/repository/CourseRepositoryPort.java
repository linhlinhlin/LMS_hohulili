package com.example.lms.course_authoring.domain.repository;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.shared.domain.valueobject.CourseCode;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain repository port for Course aggregate.
 * 
 * This is a PORT in Hexagonal Architecture - defines the contract
 * for persistence operations using pure domain models only.
 * 
 * Implementation (ADAPTER) is in infrastructure layer.
 */
public interface CourseRepositoryPort {

    /**
     * Save a course.
     */
    Course save(Course course);

    /**
     * Find course by ID.
     */
    Optional<Course> findById(UUID id);

    /**
     * Find course by code.
     */
    Optional<Course> findByCode(CourseCode code);

    /**
     * Find all courses by teacher.
     */
    List<Course> findByTeacherId(UUID teacherId);

    /**
     * Find courses by status.
     */
    List<Course> findByStatus(Course.CourseStatus status);

    /**
     * Check if code exists.
     */
    boolean existsByCode(String code);

    /**
     * Count courses by teacher.
     */
    long countByTeacherId(UUID teacherId);

    /**
     * Delete course.
     */
    void deleteById(UUID id);
}
