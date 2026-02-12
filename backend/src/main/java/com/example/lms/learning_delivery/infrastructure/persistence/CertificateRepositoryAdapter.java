package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.domain.model.Certificate;
import com.example.lms.learning_delivery.domain.repository.CertificateRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.CertificateJpaEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class CertificateRepositoryAdapter implements CertificateRepository {

    private final CertificateJpaRepository jpaRepository;

    @Override
    public Certificate save(Certificate certificate) {
        CertificateJpaEntity entity = toEntity(certificate);
        CertificateJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<Certificate> findByEnrollmentId(UUID enrollmentId) {
        return jpaRepository.findByEnrollmentId(enrollmentId).map(this::toDomain);
    }

    @Override
    public Optional<Certificate> findByVerificationToken(UUID token) {
        return jpaRepository.findByVerificationToken(token).map(this::toDomain);
    }

    @Override
    public List<Certificate> findByStudentId(UUID studentId) {
        return jpaRepository.findByStudentIdOrderByIssuedAtDesc(studentId).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public boolean existsByEnrollmentId(UUID enrollmentId) {
        return jpaRepository.existsByEnrollmentId(enrollmentId);
    }

    // ============================================================
    // Mapping
    // ============================================================

    private CertificateJpaEntity toEntity(Certificate cert) {
        return CertificateJpaEntity.builder()
                .enrollmentId(cert.getEnrollmentId())
                .studentId(cert.getStudentId())
                .courseId(cert.getCourseId())
                .verificationToken(cert.getVerificationToken())
                .issuedAt(cert.getIssuedAt())
                .build();
    }

    private Certificate toDomain(CertificateJpaEntity entity) {
        return Certificate.reconstitute(
                entity.getId(),
                entity.getEnrollmentId(),
                entity.getStudentId(),
                entity.getCourseId(),
                entity.getVerificationToken(),
                entity.getIssuedAt()
        );
    }
}
