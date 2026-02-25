package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepositoryPort;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.mapper.LearningClassEntityMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Implementation of LearningClassRepository and LearningClassRepositoryPort using Spring Data JPA.
 * Clean Architecture: Converts between domain models and JPA entities.
 */
@Component
@RequiredArgsConstructor
public class LearningClassRepositoryImpl implements LearningClassRepository, LearningClassRepositoryPort {

    private final JpaLearningClassRepository jpaRepository;
    private final LearningClassEntityMapper mapper;

    @Override
    public LearningClass save(LearningClass learningClass) {
        LearningClassJpaEntity entity = mapper.toEntity(learningClass);
        LearningClassJpaEntity saved = jpaRepository.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<LearningClass> findById(UUID id) {
        return jpaRepository.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<LearningClass> findByCode(String code) {
        return jpaRepository.findByCode(code).map(mapper::toDomain);
    }

    @Override
    public boolean existsByCode(String code) {
        return jpaRepository.existsByCode(code);
    }

    @Override
    public List<LearningClass> findByCourseId(UUID courseId) {
        return jpaRepository.findByCourseId(courseId).stream()
            .map(mapper::toDomain)
            .toList();
    }

    @Override
    public List<LearningClass> findOpenByCourseId(UUID courseId) {
        return jpaRepository.findOpenByCourseId(courseId).stream()
            .map(mapper::toDomain)
            .toList();
    }

    @Override
    public Page<LearningClass> findByTeacherId(UUID teacherId, Pageable pageable) {
        return jpaRepository.findByTeacherId(teacherId, pageable)
            .map(mapper::toDomain);
    }

    // LearningClassRepositoryPort returns List, not Page
    @Override
    public List<LearningClass> findByTeacherId(UUID teacherId) {
        return jpaRepository.findByTeacherId(teacherId, Pageable.unpaged())
            .getContent().stream()
            .map(mapper::toDomain)
            .toList();
    }

    @Override
    public void delete(LearningClass learningClass) {
        LearningClassJpaEntity entity = mapper.toEntity(learningClass);
        jpaRepository.delete(entity);
    }

    @Override
    public Optional<LearningClass> findByCourseIdAndName(UUID courseId, String name) {
        return jpaRepository.findByCourseIdAndName(courseId, name).map(mapper::toDomain);
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    @Override
    public long countByCourseId(UUID courseId) {
        return jpaRepository.countByCourseId(courseId);
    }

    @Override
    public Page<LearningClass> searchByCourseId(UUID courseId, String search, String status, Pageable pageable) {
        LearningClassJpaEntity.ClassStatus classStatus = null;
        if (status != null && !status.isBlank()) {
            try {
                classStatus = LearningClassJpaEntity.ClassStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ignored) {
                // Invalid status filter - treat as no filter
            }
        }
        String searchParam = (search != null && !search.isBlank()) ? search : null;
        return jpaRepository.searchByCourseId(courseId, searchParam, classStatus, pageable)
                .map(mapper::toDomain);
    }
}
