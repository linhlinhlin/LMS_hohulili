package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * PaymentRefund entity - Lưu trữ yêu cầu hoàn tiền
 * 
 * SOTA Design (Dec 2025):
 * - Approval workflow (PENDING -> APPROVED -> PROCESSING -> COMPLETED)
 * - Full audit trail
 * - Gateway refund integration
 */
@Entity
@Table(name = "payment_refunds",
       indexes = {
           @Index(name = "idx_refunds_payment_id", columnList = "payment_id"),
           @Index(name = "idx_refunds_user_id", columnList = "user_id"),
           @Index(name = "idx_refunds_status", columnList = "status")
       })
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PaymentRefund {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // === RELATIONSHIPS ===

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by")
    private User processedBy; // Admin who approved/rejected

    // === REFUND DATA ===

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "refund_type", length = 20)
    @Builder.Default
    private RefundType refundType = RefundType.FULL;

    // === STATUS ===

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RefundStatus status = RefundStatus.PENDING;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    // === GATEWAY INFO ===

    @Column(name = "gateway_refund_id", length = 100)
    private String gatewayRefundId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "gateway_response", columnDefinition = "jsonb")
    private Map<String, Object> gatewayResponse;

    // === TIMESTAMPS ===

    @CreationTimestamp
    @Column(name = "requested_at", updatable = false)
    private Instant requestedAt;

    @Column(name = "processed_at")
    private Instant processedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    // === METADATA ===

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    /**
     * Refund type enum
     */
    public enum RefundType {
        FULL,     // Hoàn tiền đầy đủ
        PARTIAL   // Hoàn tiền một phần
    }

    /**
     * Refund status enum
     */
    public enum RefundStatus {
        PENDING,     // Đang chờ xử lý
        APPROVED,    // Đã duyệt, chờ thực hiện
        PROCESSING,  // Đang xử lý với gateway
        COMPLETED,   // Hoàn tiền thành công
        REJECTED     // Bị từ chối
    }

    // ============ Domain Methods ============

    /**
     * Approve refund request
     */
    public void approve(User admin) {
        this.status = RefundStatus.APPROVED;
        this.processedBy = admin;
        this.processedAt = Instant.now();
    }

    /**
     * Reject refund request
     */
    public void reject(User admin, String reason) {
        this.status = RefundStatus.REJECTED;
        this.processedBy = admin;
        this.rejectionReason = reason;
        this.processedAt = Instant.now();
    }

    /**
     * Mark as processing (sent to gateway)
     */
    public void startProcessing() {
        this.status = RefundStatus.PROCESSING;
    }

    /**
     * Complete refund
     */
    public void complete(String gatewayRefundId, Map<String, Object> response) {
        this.status = RefundStatus.COMPLETED;
        this.gatewayRefundId = gatewayRefundId;
        this.gatewayResponse = response;
        this.completedAt = Instant.now();
    }

    /**
     * Check if refund is pending
     */
    public boolean isPending() {
        return status == RefundStatus.PENDING;
    }

    /**
     * Check if refund can be processed
     */
    public boolean canProcess() {
        return status == RefundStatus.APPROVED;
    }
}
