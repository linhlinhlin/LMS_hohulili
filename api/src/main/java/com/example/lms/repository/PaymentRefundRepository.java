package com.example.lms.repository;

import com.example.lms.entity.PaymentRefund;
import com.example.lms.entity.PaymentRefund.RefundStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * PaymentRefundRepository - Data access for PaymentRefund entity
 */
@Repository
public interface PaymentRefundRepository extends JpaRepository<PaymentRefund, UUID> {

    // === FIND BY PAYMENT/USER ===

    /**
     * Find all refunds for a payment
     */
    List<PaymentRefund> findByPaymentId(UUID paymentId);

    /**
     * Find all refunds requested by a user
     */
    Page<PaymentRefund> findByUserIdOrderByRequestedAtDesc(UUID userId, Pageable pageable);

    /**
     * Check if payment has pending or processing refund
     */
    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END FROM PaymentRefund r " +
           "WHERE r.payment.id = :paymentId AND r.status IN ('PENDING', 'APPROVED', 'PROCESSING')")
    boolean hasActiveRefundRequest(@Param("paymentId") UUID paymentId);

    // === FIND BY STATUS ===

    /**
     * Find pending refunds (for admin approval)
     */
    Page<PaymentRefund> findByStatusOrderByRequestedAtAsc(RefundStatus status, Pageable pageable);

    /**
     * Find refunds by multiple statuses
     */
    Page<PaymentRefund> findByStatusIn(List<RefundStatus> statuses, Pageable pageable);

    /**
     * Count pending refunds
     */
    long countByStatus(RefundStatus status);

    // === ANALYTICS ===

    /**
     * Total refunded amount
     */
    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM PaymentRefund r WHERE r.status = 'COMPLETED'")
    BigDecimal getTotalRefundedAmount();

    /**
     * Refund rate: completed refunds / total payments
     */
    @Query("SELECT COUNT(r) FROM PaymentRefund r WHERE r.status = 'COMPLETED'")
    long countCompletedRefunds();
}
