package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Implementation of LearningClassRepository and LearningClassRepositoryPort using Spring Data JPA.
 */
@Component
@RequiredArgsConstructor
public class LearningClassRepositoryImpl implements LearningClassRepository, LearningClassRepositoryPort {

    private final JpaLearningClassRepository jpaRepository;

    @Override
    public LearningClass save(LearningClass learningClass) {
        return jpaRepository.save(learningClass);
    }

    @Override
    public Optional<LearningClass> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public Optional<LearningClass> findByCode(String code) {
        return jpaRepository.findByCode(code);
    }

    @Override
    public boolean existsByCode(String code) {
        return jpaRepository.existsByCode(code);
    }

    @Override
    public List<LearningClass> findByCourseId(UUID courseId) {
        return jpaRepository.findByCourseId(courseId);
    }

    @Override
    public List<LearningClass> findOpenByCourseId(UUID courseId) {
        return jpaRepository.findOpenByCourseId(courseId);
    }

    @Override
    public Page<LearningClass> findByTeacherId(UUID teacherId, Pageable pageable) {
        return jpaRepository.findByTeacherId(teacherId, pageable);
    }

    // LearningClassRepositoryPort returns List, not Page
    @Override
    public List<LearningClass> findByTeacherId(UUID teacherId) {
        return jpaRepository.findByTeacherId(teacherId, Pageable.unpaged()).getContent();
    }

    @Override
    public void delete(LearningClass learningClass) {
        jpaRepository.delete(learningClass);
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    @Override
    public long countByCourseId(UUID courseId) {
        return jpaRepository.countByCourseId(courseId);
    }
}

