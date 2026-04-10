package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.CertificateJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
public interface CertificateJpaRepository extends JpaRepository<CertificateJpaEntity, UUID> {

    List<CertificateJpaEntity> findByStudentIdOrderByIssuedAtDesc(UUID studentId);

    long countByStudentId(UUID studentId);

    Optional<CertificateJpaEntity> findByVerificationToken(UUID token);

    Optional<CertificateJpaEntity> findByEnrollmentId(UUID enrollmentId);

    boolean existsByEnrollmentId(UUID enrollmentId);

    @Query("SELECT c.enrollmentId FROM CertificateJpaEntity c WHERE c.enrollmentId IN :enrollmentIds")
    Set<UUID> findEnrollmentIdsWithCertificates(@Param("enrollmentIds") List<UUID> enrollmentIds);
}
