package com.example.lms.learning_delivery.domain.repository;

import com.example.lms.learning_delivery.domain.model.Certificate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Port interface for Certificate persistence.
 */
public interface CertificateRepository {
    Certificate save(Certificate certificate);
    Optional<Certificate> findByEnrollmentId(UUID enrollmentId);
    Optional<Certificate> findByVerificationToken(UUID token);
    List<Certificate> findByStudentId(UUID studentId);
    boolean existsByEnrollmentId(UUID enrollmentId);
}
