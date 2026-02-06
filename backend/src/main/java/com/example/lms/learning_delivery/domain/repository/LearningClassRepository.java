package com.example.lms.learning_delivery.domain.repository;

import com.example.lms.learning_delivery.domain.model.LearningClass;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for LearningClass aggregate.
 */
public interface LearningClassRepository {

    /**
     * Save a learning class.
     */
    LearningClass save(LearningClass learningClass);

    /**
     * Find learning class by ID.
     */
    Optional<LearningClass> findById(UUID id);

    /**
     * Find learning class by code.
     */
    Optional<LearningClass> findByCode(String code);

    /**
     * Check if code exists.
     */
    boolean existsByCode(String code);

    /**
     * Find all classes for a course.
     */
    List<LearningClass> findByCourseId(UUID courseId);

    /**
     * Find open classes for a course.
     */
    List<LearningClass> findOpenByCourseId(UUID courseId);

    /**
     * Find classes by teacher.
     */
    Page<LearningClass> findByTeacherId(UUID teacherId, Pageable pageable);

    /**
     * Delete a learning class.
     */
    void delete(LearningClass learningClass);

    /**
     * Count classes for a course.
     */
    long countByCourseId(UUID courseId);

    /**
     * Search classes for a course with optional filters.
     */
    Page<LearningClass> searchByCourseId(UUID courseId, String search, String status, Pageable pageable);
}
