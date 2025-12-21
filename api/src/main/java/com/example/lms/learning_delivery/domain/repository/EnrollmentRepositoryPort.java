package com.example.lms.learning_delivery.domain.repository;

import com.example.lms.learning_delivery.domain.model.Enrollment;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain repository port for Enrollment aggregate.
 */
public interface EnrollmentRepositoryPort {

    Enrollment save(Enrollment enrollment);

    Optional<Enrollment> findById(UUID id);

    Optional<Enrollment> findByClassIdAndStudentId(UUID classId, UUID studentId);

    List<Enrollment> findByClassId(UUID classId);

    List<Enrollment> findByStudentId(UUID studentId);

    boolean existsByClassIdAndStudentId(UUID classId, UUID studentId);

    long countByClassId(UUID classId);

    void deleteById(UUID id);
}
