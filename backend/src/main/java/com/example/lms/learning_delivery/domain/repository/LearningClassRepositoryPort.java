package com.example.lms.learning_delivery.domain.repository;

import com.example.lms.learning_delivery.domain.model.LearningClass;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain repository port for LearningClass aggregate.
 */
public interface LearningClassRepositoryPort {

    LearningClass save(LearningClass learningClass);

    Optional<LearningClass> findById(UUID id);

    Optional<LearningClass> findByCode(String code);

    List<LearningClass> findByCourseId(UUID courseId);

    List<LearningClass> findByTeacherId(UUID teacherId);

    boolean existsByCode(String code);

    long countByCourseId(UUID courseId);

    Optional<LearningClass> findByCourseIdAndName(UUID courseId, String name);

    void deleteById(UUID id);
}
