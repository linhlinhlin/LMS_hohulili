package com.example.lms.shared.infrastructure.persistence.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity for Payment Transactions.
 * Replaces the in-memory HashMap in PaymentControllerV3.
 */
@Entity
@Table(name = "payment_transactions")
public class PaymentTransactionJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(length = 3, nullable = false)
    private String currency = "VND";

    @Column(name = "payment_method", length = 50, nullable = false)
    private String paymentMethod = "SIMULATED";

    @Column(name = "transaction_id", unique = true, nullable = false)
    private String transactionId;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private PaymentStatus status = PaymentStatus.PENDING;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "vnp_transaction_no", length = 50)
    private String vnpTransactionNo;

    @Column(name = "vnp_bank_code", length = 20)
    private String vnpBankCode;

    @Column(name = "vnp_response_code", length = 5)
    private String vnpResponseCode;

    @Column(name = "vnp_card_type", length = 20)
    private String vnpCardType;

    // SePay metadata (V80 migration)
    @Column(name = "sepay_transaction_code", length = 100)
    private String sepayTransactionCode;

    // Refund tracking (V60 migration)
    @Column(name = "refund_status", length = 20)
    private String refundStatus = "NONE";

    @Column(name = "refund_requested_at")
    private Instant refundRequestedAt;

    @Column(name = "refund_completed_at")
    private Instant refundCompletedAt;

    @Column(name = "refund_reason", columnDefinition = "TEXT")
    private String refundReason;

    @Column(name = "refund_admin_note", columnDefinition = "TEXT")
    private String refundAdminNote;

    @Version
    @Column(name = "version")
    private Long version;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public PaymentTransactionJpaEntity() {}

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID id;
        private UUID organizationId;
        private UUID studentId;
        private UUID courseId;
        private BigDecimal amount = BigDecimal.ZERO;
        private String currency = "VND";
        private String paymentMethod = "SIMULATED";
        private String transactionId;
        private PaymentStatus status = PaymentStatus.PENDING;
        private Instant paidAt;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder organizationId(UUID organizationId) { this.organizationId = organizationId; return this; }
        public Builder studentId(UUID studentId) { this.studentId = studentId; return this; }
        public Builder courseId(UUID courseId) { this.courseId = courseId; return this; }
        public Builder amount(BigDecimal amount) { this.amount = amount; return this; }
        public Builder currency(String currency) { this.currency = currency; return this; }
        public Builder paymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; return this; }
        public Builder transactionId(String transactionId) { this.transactionId = transactionId; return this; }
        public Builder status(PaymentStatus status) { this.status = status; return this; }
        public Builder paidAt(Instant paidAt) { this.paidAt = paidAt; return this; }

        public PaymentTransactionJpaEntity build() {
            PaymentTransactionJpaEntity e = new PaymentTransactionJpaEntity();
            e.id = id; e.organizationId = organizationId; e.studentId = studentId; e.courseId = courseId; e.amount = amount;
            e.currency = currency; e.paymentMethod = paymentMethod; e.transactionId = transactionId;
            e.status = status; e.paidAt = paidAt;
            return e;
        }
    }

    // Getters
    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getStudentId() { return studentId; }
    public UUID getCourseId() { return courseId; }
    public BigDecimal getAmount() { return amount; }
    public String getCurrency() { return currency; }
    public String getPaymentMethod() { return paymentMethod; }
    public String getTransactionId() { return transactionId; }
    public PaymentStatus getStatus() { return status; }
    public Instant getPaidAt() { return paidAt; }
    public Instant getCreatedAt() { return createdAt; }

    public String getVnpTransactionNo() { return vnpTransactionNo; }
    public String getVnpBankCode() { return vnpBankCode; }
    public String getVnpResponseCode() { return vnpResponseCode; }
    public String getVnpCardType() { return vnpCardType; }
    public String getSepayTransactionCode() { return sepayTransactionCode; }

    public Long getVersion() { return version; }

    // Refund getters
    public String getRefundStatus() { return refundStatus; }
    public Instant getRefundRequestedAt() { return refundRequestedAt; }
    public Instant getRefundCompletedAt() { return refundCompletedAt; }
    public String getRefundReason() { return refundReason; }
    public String getRefundAdminNote() { return refundAdminNote; }

    // Setters
    public void setOrganizationId(UUID organizationId) { this.organizationId = organizationId; }
    public void setStatus(PaymentStatus status) { this.status = status; }
    public void setPaidAt(Instant paidAt) { this.paidAt = paidAt; }
    public void setVnpTransactionNo(String vnpTransactionNo) { this.vnpTransactionNo = vnpTransactionNo; }
    public void setVnpBankCode(String vnpBankCode) { this.vnpBankCode = vnpBankCode; }
    public void setVnpResponseCode(String vnpResponseCode) { this.vnpResponseCode = vnpResponseCode; }
    public void setVnpCardType(String vnpCardType) { this.vnpCardType = vnpCardType; }
    public void setSepayTransactionCode(String sepayTransactionCode) { this.sepayTransactionCode = sepayTransactionCode; }
    public void setRefundStatus(String refundStatus) { this.refundStatus = refundStatus; }
    public void setRefundRequestedAt(Instant refundRequestedAt) { this.refundRequestedAt = refundRequestedAt; }
    public void setRefundCompletedAt(Instant refundCompletedAt) { this.refundCompletedAt = refundCompletedAt; }
    public void setRefundReason(String refundReason) { this.refundReason = refundReason; }
    public void setRefundAdminNote(String refundAdminNote) { this.refundAdminNote = refundAdminNote; }
    public void setVersion(Long version) { this.version = version; }

    public enum PaymentStatus {
        PENDING, COMPLETED, FAILED, REFUNDED, EXPIRED
    }
}
