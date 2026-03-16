package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.application.port.CertificateEligibilityPort;
import com.example.lms.learning_delivery.domain.model.Certificate;
import com.example.lms.learning_delivery.domain.repository.CertificateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Use case for certificate issuance, listing, and verification.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CertificateUseCase {

    private final CertificateRepository certificateRepository;
    private final CertificateEligibilityPort certificateEligibilityPort;

    /**
     * Issue a certificate if one doesn't already exist for this enrollment.
     * Idempotent: returns existing certificate if already issued.
     */
    @Transactional
    public Certificate issueIfNotExists(UUID enrollmentId, UUID studentId, UUID courseId) {
        // Idempotent check
        Optional<Certificate> existing = certificateRepository.findByEnrollmentId(enrollmentId);
        if (existing.isPresent()) {
            log.debug("Certificate already exists for enrollment {}", enrollmentId);
            return existing.get();
        }

        CertificateEligibilityPort.EligibilityResult eligibility =
                certificateEligibilityPort.evaluate(enrollmentId, studentId, courseId);
        if (!eligibility.eligible()) {
            throw new IllegalStateException(eligibility.reason());
        }

        Certificate certificate = Certificate.issue(enrollmentId, studentId, courseId);
        Certificate saved = certificateRepository.save(certificate);
        log.info("Certificate issued for enrollment {} (student={}, course={})",
                enrollmentId, studentId, courseId);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Certificate> findByStudent(UUID studentId) {
        return certificateRepository.findByStudentId(studentId);
    }

    @Transactional(readOnly = true)
    public Optional<Certificate> verifyByToken(UUID token) {
        return certificateRepository.findByVerificationToken(token);
    }
}
