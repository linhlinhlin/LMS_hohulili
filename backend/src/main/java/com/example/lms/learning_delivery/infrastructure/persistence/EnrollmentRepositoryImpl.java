package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepository;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Implementation of EnrollmentRepository and EnrollmentRepositoryPort using Spring Data JPA.
 */
@Component
@RequiredArgsConstructor
public class EnrollmentRepositoryImpl implements EnrollmentRepository, EnrollmentRepositoryPort {

    private final JpaEnrollmentRepository jpaRepository;

    @Override
    public Enrollment save(Enrollment enrollment) {
        return jpaRepository.save(enrollment);
    }

    @Override
    public Optional<Enrollment> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public Optional<Enrollment> findByStudentIdAndClassId(UUID studentId, UUID classId) {
        return jpaRepository.findByStudentIdAndClassId(studentId, classId);
    }

    // EnrollmentRepositoryPort uses different parameter order
    @Override
    public Optional<Enrollment> findByClassIdAndStudentId(UUID classId, UUID studentId) {
        return jpaRepository.findByStudentIdAndClassId(studentId, classId);
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
        return jpaRepository.findByStudentId(studentId);
    }

    @Override
    public Page<Enrollment> findByClassId(UUID classId, Pageable pageable) {
        return jpaRepository.findByClassId(classId, pageable);
    }

    // EnrollmentRepositoryPort returns List, not Page
    @Override
    public List<Enrollment> findByClassId(UUID classId) {
        return jpaRepository.findByClassId(classId, Pageable.unpaged()).getContent();
    }

    @Override
    public List<Enrollment> findActiveByStudentId(UUID studentId) {
        return jpaRepository.findActiveByStudentId(studentId);
    }

    @Override
    public long countByClassId(UUID classId) {
        return jpaRepository.countByClassId(classId);
    }

    @Override
    public void delete(Enrollment enrollment) {
        jpaRepository.delete(enrollment);
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }
}

