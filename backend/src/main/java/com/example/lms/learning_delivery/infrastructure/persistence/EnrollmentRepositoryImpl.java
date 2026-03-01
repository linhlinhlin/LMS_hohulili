package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepository;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepositoryPort;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.mapper.EnrollmentEntityMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Implementation of EnrollmentRepository and EnrollmentRepositoryPort using Spring Data JPA.
 * Clean Architecture: Converts between domain models and JPA entities.
 */
@Component
@RequiredArgsConstructor
public class EnrollmentRepositoryImpl implements EnrollmentRepository, EnrollmentRepositoryPort {

    private final JpaEnrollmentRepository jpaRepository;
    private final JpaLearningClassRepository jpaLearningClassRepository;
    private final EnrollmentEntityMapper mapper;

    @Override
    public Enrollment save(Enrollment enrollment) {
        // Look up the LearningClass JPA entity (eagerly loaded, avoids LazyInitializationException)
        LearningClassJpaEntity learningClassEntity = null;
        if (enrollment.getLearningClass() != null && enrollment.getLearningClass().getId() != null) {
            learningClassEntity = jpaLearningClassRepository.findById(enrollment.getLearningClass().getId())
                    .orElse(null);
        }

        EnrollmentJpaEntity entity = mapper.toEntity(enrollment, learningClassEntity);
        EnrollmentJpaEntity saved = jpaRepository.save(entity);

        // Set the eagerly-loaded learningClass on the saved entity to avoid lazy proxy issues
        // (open-in-view is disabled, so Hibernate session may be closed)
        if (learningClassEntity != null) {
            saved.setLearningClass(learningClassEntity);
        }
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<Enrollment> findById(UUID id) {
        return jpaRepository.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<Enrollment> findByStudentIdAndClassId(UUID studentId, UUID classId) {
        return jpaRepository.findByStudentIdAndClassId(studentId, classId).map(mapper::toDomain);
    }

    // EnrollmentRepositoryPort uses different parameter order
    @Override
    public Optional<Enrollment> findByClassIdAndStudentId(UUID classId, UUID studentId) {
        return jpaRepository.findByStudentIdAndClassId(studentId, classId).map(mapper::toDomain);
    }

    @Override
    public boolean existsByStudentIdAndClassId(UUID studentId, UUID classId) {
        return jpaRepository.existsByStudentIdAndClassId(studentId, classId);
    }

    // EnrollmentRepositoryPort uses different parameter order
    @Override
    public boolean existsByClassIdAndStudentId(UUID classId, UUID studentId) {
        return jpaRepository.existsByStudentIdAndClassId(studentId, classId);
    }

    @Override
    public List<Enrollment> findByStudentId(UUID studentId) {
        return jpaRepository.findByStudentId(studentId).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public Page<Enrollment> findByClassId(UUID classId, Pageable pageable) {
        return jpaRepository.findByClassId(classId, pageable)
                .map(mapper::toDomain);
    }

    // EnrollmentRepositoryPort returns List, not Page
    @Override
    public List<Enrollment> findByClassId(UUID classId) {
        return jpaRepository.findAllByClassId(classId).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public List<Enrollment> findActiveByStudentId(UUID studentId) {
        return jpaRepository.findActiveByStudentId(studentId).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public long countByClassId(UUID classId) {
        return jpaRepository.countByClassId(classId);
    }

    @Override
    public void delete(Enrollment enrollment) {
        if (enrollment != null && enrollment.getId() != null) {
            jpaRepository.deleteById(enrollment.getId());
        }
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    // Additional methods used by controllers

    public List<Enrollment> findActiveWithClass(UUID studentId) {
        return jpaRepository.findActiveWithClass(studentId).stream()
                .map(mapper::toDomain)
                .toList();
    }

    public List<Enrollment> findActiveAndCompletedWithClass(UUID studentId) {
        return jpaRepository.findActiveAndCompletedWithClass(studentId).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public Optional<Enrollment> findByStudentIdAndCourseId(UUID studentId, UUID courseId) {
        return jpaRepository.findByStudentIdAndCourseId(studentId, courseId)
                .map(mapper::toDomain);
    }

    public List<Enrollment> findByLearningClass_CourseId(UUID courseId) {
        return jpaRepository.findByLearningClass_CourseId(courseId).stream()
                .map(mapper::toDomain)
                .toList();
    }
}
