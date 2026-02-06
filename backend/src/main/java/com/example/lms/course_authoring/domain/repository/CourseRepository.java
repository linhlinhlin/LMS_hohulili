package com.example.lms.course_authoring.domain.repository;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.shared.domain.valueobject.CourseCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Course aggregate.
 * This is a domain port - implementation is in infrastructure layer.
 */
public interface CourseRepository {

    /**
     * Save a course (create or update).
     */
    Course save(Course course);

    /**
     * Find course by ID.
     */
    Optional<Course> findById(UUID id);

    /**
     * Find course by ID with chapters and lessons eagerly loaded.
     */
    Optional<Course> findByIdWithContent(UUID id);

    /**
     * Find course by code.
     */
    Optional<Course> findByCode(CourseCode code);

    /**
     * Check if a course code already exists.
     */
    boolean existsByCode(CourseCode code);

    /**
     * Delete a course.
     */
    void delete(Course course);

    /**
     * Delete a course by ID.
     */
    void deleteById(UUID id);

    /**
     * Find all courses by teacher ID.
     */
    Page<Course> findByTeacherId(UUID teacherId, Pageable pageable);

    /**
     * Find all approved courses.
     */
    Page<Course> findApproved(Pageable pageable);

    /**
     * Find approved courses with search.
     */
    Page<Course> findApprovedByTitleContaining(String search, Pageable pageable);

    /**
     * Find all pending courses (for admin review).
     */
    Page<Course> findPending(Pageable pageable);

    /**
     * Count courses by teacher ID.
     */
    long countByTeacherId(UUID teacherId);

    /**
     * Count courses by status.
     */
    long countByStatus(Course.CourseStatus status);

    /**
     * Find all courses with pagination.
     */
    Page<Course> findAll(Pageable pageable);

    /**
     * Find courses by status with pagination.
     */
    Page<Course> findByStatus(Course.CourseStatus status, Pageable pageable);

    /**
     * Count all courses.
     */
    long count();

    /**
     * Check if course exists by ID.
     */
    boolean existsById(UUID id);

    /**
     * Check if course with given code exists.
     */
    boolean existsByCodeValue(String code);

    /**
     * Find course containing a specific chapter.
     */
    Optional<Course> findByChapterId(UUID chapterId);

    /**
     * Find course containing a specific lesson.
     */
    Optional<Course> findByLessonId(UUID lessonId);

    /**
     * Find courses by status and title containing search text.
     */
    Page<Course> findByStatusAndTitleContaining(Course.CourseStatus status, String search, Pageable pageable);
}
