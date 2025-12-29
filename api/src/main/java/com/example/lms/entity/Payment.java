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

import com.example.lms.learning_delivery.domain.model.Enrollment;

/**
 * Payment entity - Lưu trữ thông tin thanh toán khóa học
 * 
 * SOTA Design (Dec 2025):
 * - Immutable transaction records
 * - Gateway integration support (VNPay, ZaloPay, MoMo)
 * - Full audit trail
 * - Expiration handling for payment links
 */
@Entity
@Table(name = "payments", 
       indexes = {
           @Index(name = "idx_payments_user_id", columnList = "student_id"),
           @Index(name = "idx_payments_course_id", columnList = "course_id"),
           @Index(name = "idx_payments_status", columnList = "status"),
           @Index(name = "idx_payments_gateway_tx_id", columnList = "gateway_transaction_id"),
           @Index(name = "idx_payments_created_at", columnList = "created_at")
       })
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // === RELATIONSHIPS ===

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id")
    private Enrollment enrollment;

    // === FINANCIAL DATA ===

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "original_amount", precision = 15, scale = 2)
    private BigDecimal originalAmount;

    @Column(length = 3)
    @Builder.Default
    private String currency = "VND";

    // === PAYMENT GATEWAY INFO ===

    @Column(name = "payment_method", length = 50)
    private String paymentMethod; // VNPAY, ZALOPAY, MOMO, BANK_TRANSFER, SIMULATED

    @Column(name = "gateway_transaction_id", length = 100)
    private String gatewayTransactionId;

    @Column(name = "gateway_order_id", length = 100)
    private String gatewayOrderId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "gateway_response", columnDefinition = "jsonb")
    private Map<String, Object> gatewayResponse;

    // === STATUS & LIFECYCLE ===

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    @Column(name = "status_reason", columnDefinition = "TEXT")
    private String statusReason;

    // === TIMESTAMPS ===

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    // === AUDIT DATA ===

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    // === LEGACY FIELDS (backward compatibility) ===

    @Column(name = "transaction_id", length = 100)
    @Deprecated
    private String transactionId; // Use gatewayTransactionId instead

    @Column(name = "notes", length = 500)
    private String notes;

    /**
     * Payment status enum
     * SOTA: Following Stripe/VNPay patterns
     */
    public enum PaymentStatus {
        PENDING,            // Đang chờ thanh toán
        PROCESSING,         // Đang xử lý (gateway callback received)
        COMPLETED,          // Thanh toán thành công
        FAILED,             // Thanh toán thất bại
        CANCELLED,          // Người dùng hủy
        EXPIRED,            // Payment link hết hạn
        REFUNDED,           // Đã hoàn tiền đầy đủ
        PARTIALLY_REFUNDED  // Đã hoàn tiền một phần
    }

    // ============ Lifecycle Callbacks ============

    @PrePersist
    protected void onCreate() {
        if (expiresAt == null && createdAt != null) {
            // Default: payment link expires in 15 minutes
            expiresAt = createdAt.plusSeconds(15 * 60);
        }
    }

    // ============ Domain Methods ============

    /**
     * Complete payment with gateway response
     */
    public void complete(String transactionId, Map<String, Object> response) {
        this.status = PaymentStatus.COMPLETED;
        this.gatewayTransactionId = transactionId;
        this.gatewayResponse = response;
        this.paidAt = Instant.now();
    }

    /**
     * Complete payment (simple version for simulated payments)
     */
    public void complete() {
        this.status = PaymentStatus.COMPLETED;
        this.paidAt = Instant.now();
    }

    /**
     * Mark as failed with reason
     */
    public void fail(String reason) {
        this.status = PaymentStatus.FAILED;
        this.statusReason = reason;
    }

    /**
     * Mark as failed with gateway response
     */
    public void fail(String reason, Map<String, Object> response) {
        this.status = PaymentStatus.FAILED;
        this.statusReason = reason;
        this.gatewayResponse = response;
    }

    /**
     * Mark as cancelled
     */
    public void cancel(String reason) {
        this.status = PaymentStatus.CANCELLED;
        this.statusReason = reason;
    }

    /**
     * Mark as refunded
     */
    public void refund() {
        this.status = PaymentStatus.REFUNDED;
    }

    /**
     * Mark as partially refunded
     */
    public void partialRefund() {
        this.status = PaymentStatus.PARTIALLY_REFUNDED;
    }

    /**
     * Check if payment is valid (completed and not refunded)
     */
    public boolean isValid() {
        return this.status == PaymentStatus.COMPLETED;
    }

    /**
     * Check if payment is completed
     */
    public boolean isCompleted() {
        return status == PaymentStatus.COMPLETED;
    }

    /**
     * Check if payment is pending
     */
    public boolean isPending() {
        return status == PaymentStatus.PENDING || status == PaymentStatus.PROCESSING;
    }

    /**
     * Check if payment is refunded
     */
    public boolean isRefunded() {
        return status == PaymentStatus.REFUNDED || status == PaymentStatus.PARTIALLY_REFUNDED;
    }

    /**
     * Check if payment link is expired
     */
    public boolean isExpired() {
        return status == PaymentStatus.EXPIRED || 
               (status == PaymentStatus.PENDING && expiresAt != null && Instant.now().isAfter(expiresAt));
    }
}
