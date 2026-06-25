package com.example.lms.shared.infrastructure.persistence.repository;

import com.example.lms.shared.infrastructure.persistence.entity.PaymentTransactionJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentTransactionJpaRepository extends JpaRepository<PaymentTransactionJpaEntity, UUID> {

    // Always get the LATEST payment to handle multiple payments per student+course
    Optional<PaymentTransactionJpaEntity> findTopByStudentIdAndCourseIdOrderByCreatedAtDesc(UUID studentId, UUID courseId);

    Optional<PaymentTransactionJpaEntity> findByTransactionId(String transactionId);

    List<PaymentTransactionJpaEntity> findByStudentIdOrderByCreatedAtDesc(UUID studentId);

    boolean existsByStudentIdAndCourseId(UUID studentId, UUID courseId);

    boolean existsByStudentIdAndCourseIdAndStatus(UUID studentId, UUID courseId, PaymentTransactionJpaEntity.PaymentStatus status);

    @Query("SELECT p.courseId FROM PaymentTransactionJpaEntity p WHERE p.studentId = :studentId AND p.courseId IN :courseIds AND p.status = :status")
    List<UUID> findPaidCourseIds(@Param("studentId") UUID studentId, @Param("courseIds") java.util.Collection<UUID> courseIds, @Param("status") PaymentTransactionJpaEntity.PaymentStatus status);

    // Admin queries
    org.springframework.data.domain.Page<PaymentTransactionJpaEntity> findByStatus(PaymentTransactionJpaEntity.PaymentStatus status, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<PaymentTransactionJpaEntity> findByOrganizationIdOrderByCreatedAtDesc(UUID organizationId, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<PaymentTransactionJpaEntity> findByOrganizationIdAndStatusOrderByCreatedAtDesc(
            UUID organizationId,
            PaymentTransactionJpaEntity.PaymentStatus status,
            org.springframework.data.domain.Pageable pageable
    );

    // Expiry cleanup: find old PENDING payments
    List<PaymentTransactionJpaEntity> findByStatusAndCreatedAtBefore(PaymentTransactionJpaEntity.PaymentStatus status, Instant cutoff);

    // === Analytics queries ===

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PaymentTransactionJpaEntity p WHERE p.courseId IN :courseIds AND p.status = 'COMPLETED'")
    BigDecimal sumRevenueByCourseIds(@Param("courseIds") List<UUID> courseIds);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PaymentTransactionJpaEntity p WHERE p.status = 'COMPLETED'")
    BigDecimal sumTotalRevenue();

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PaymentTransactionJpaEntity p WHERE p.status = 'COMPLETED' AND p.paidAt >= :from AND p.paidAt < :to")
    BigDecimal sumRevenueByDateRange(@Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PaymentTransactionJpaEntity p WHERE p.courseId IN :courseIds AND p.status = 'COMPLETED' AND p.paidAt >= :from AND p.paidAt < :to")
    BigDecimal sumRevenueByCourseIdsAndDateRange(@Param("courseIds") List<UUID> courseIds, @Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PaymentTransactionJpaEntity p WHERE p.organizationId = :organizationId AND p.status = 'COMPLETED' AND p.paidAt >= :from AND p.paidAt < :to")
    BigDecimal sumRevenueByOrganizationIdAndDateRange(@Param("organizationId") UUID organizationId, @Param("from") Instant from, @Param("to") Instant to);

    @Query(value = "SELECT p FROM PaymentTransactionJpaEntity p WHERE p.courseId IN :courseIds ORDER BY p.createdAt DESC",
           countQuery = "SELECT COUNT(p) FROM PaymentTransactionJpaEntity p WHERE p.courseId IN :courseIds")
    org.springframework.data.domain.Page<PaymentTransactionJpaEntity> findByCourseIdIn(@Param("courseIds") List<UUID> courseIds, org.springframework.data.domain.Pageable pageable);

    @Query(value = "SELECT p FROM PaymentTransactionJpaEntity p WHERE p.courseId IN :courseIds AND p.status = :status ORDER BY p.createdAt DESC",
           countQuery = "SELECT COUNT(p) FROM PaymentTransactionJpaEntity p WHERE p.courseId IN :courseIds AND p.status = :status")
    org.springframework.data.domain.Page<PaymentTransactionJpaEntity> findByCourseIdInAndStatus(@Param("courseIds") List<UUID> courseIds, @Param("status") PaymentTransactionJpaEntity.PaymentStatus status, org.springframework.data.domain.Pageable pageable);

    /**
     * Find completed payments for given course IDs (non-paginated).
     * Used for Option B: teacher assigns students to class after payment.
     */
    @Query("SELECT p FROM PaymentTransactionJpaEntity p WHERE p.courseId IN :courseIds AND p.status = 'COMPLETED' ORDER BY p.createdAt DESC")
    List<PaymentTransactionJpaEntity> findCompletedByCourseIds(@Param("courseIds") List<UUID> courseIds);

    @Query("""
        SELECT p.id FROM PaymentTransactionJpaEntity p
        WHERE p.status = 'COMPLETED'
          AND NOT EXISTS (
            SELECT 1 FROM RevenueSplitJpaEntity r
            WHERE r.paymentId = p.id
          )
        ORDER BY p.paidAt DESC, p.createdAt DESC
        """)
    List<UUID> findCompletedPaymentIdsWithoutRevenueSplit(Pageable pageable);
}
