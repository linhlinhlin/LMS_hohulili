package com.example.lms.shared.domain.model;

import com.example.lms.shared.exception.BusinessRuleException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Domain model for Payment Transaction.
 * Contains business logic for payment state transitions.
 *
 * Pure Java — no framework annotations.
 */
public class PaymentTransaction {

    private UUID id;
    private UUID studentId;
    private UUID courseId;
    private BigDecimal amount;
    private String currency;
    private String paymentMethod;
    private String transactionId;
    private PaymentStatus status;
    private Instant paidAt;
    private Instant createdAt;

    // VNPay metadata
    private String vnpTransactionNo;
    private String vnpBankCode;
    private String vnpResponseCode;
    private String vnpCardType;

    // Refund tracking
    private String refundStatus;
    private Instant refundRequestedAt;
    private Instant refundCompletedAt;
    private String refundReason;
    private String refundAdminNote;

    private Long version;

    // ==================== Factory Methods ====================

    /**
     * Create a new PENDING payment for VNPay checkout.
     */
    public static PaymentTransaction createPending(UUID studentId, UUID courseId, BigDecimal amount, String paymentMethod) {
        Objects.requireNonNull(studentId, "Student ID is required");
        Objects.requireNonNull(courseId, "Course ID is required");
        Objects.requireNonNull(amount, "Amount is required");
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("Số tiền thanh toán phải lớn hơn 0");
        }

        var payment = new PaymentTransaction();
        payment.id = UUID.randomUUID();
        payment.studentId = studentId;
        payment.courseId = courseId;
        payment.amount = amount;
        payment.currency = "VND";
        payment.paymentMethod = paymentMethod != null ? paymentMethod : "VNPAY";
        payment.transactionId = UUID.randomUUID().toString();
        payment.status = PaymentStatus.PENDING;
        payment.refundStatus = "NONE";
        payment.version = 0L;
        return payment;
    }

    /**
     * Create a COMPLETED simulated payment (dev-only).
     */
    public static PaymentTransaction createSimulated(UUID studentId, UUID courseId, BigDecimal amount, String paymentMethod) {
        Objects.requireNonNull(studentId, "Student ID is required");
        Objects.requireNonNull(courseId, "Course ID is required");

        var payment = new PaymentTransaction();
        payment.id = UUID.randomUUID();
        payment.studentId = studentId;
        payment.courseId = courseId;
        payment.amount = amount != null ? amount : BigDecimal.ZERO;
        payment.currency = "VND";
        payment.paymentMethod = paymentMethod != null ? paymentMethod : "SIMULATED";
        payment.transactionId = "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        payment.status = PaymentStatus.COMPLETED;
        payment.paidAt = Instant.now();
        payment.refundStatus = "NONE";
        payment.version = 0L;
        return payment;
    }

    // ==================== Business Methods ====================

    /**
     * Mark payment as COMPLETED after successful VNPay IPN verification.
     * State guard: only PENDING → COMPLETED is allowed.
     */
    public void markCompleted() {
        if (this.status != PaymentStatus.PENDING) {
            throw new BusinessRuleException(
                    "Chỉ có thể hoàn thành giao dịch đang chờ xử lý. Trạng thái hiện tại: " + this.status);
        }
        this.status = PaymentStatus.COMPLETED;
        this.paidAt = Instant.now();
    }

    /**
     * Mark payment as FAILED after unsuccessful VNPay IPN.
     * State guard: only PENDING → FAILED is allowed.
     */
    public void markFailed() {
        if (this.status != PaymentStatus.PENDING) {
            throw new BusinessRuleException(
                    "Chỉ có thể thất bại giao dịch đang chờ xử lý. Trạng thái hiện tại: " + this.status);
        }
        this.status = PaymentStatus.FAILED;
    }

    /**
     * Mark payment as EXPIRED (stale PENDING cleanup).
     */
    public void markExpired() {
        if (this.status != PaymentStatus.PENDING) {
            throw new BusinessRuleException(
                    "Chỉ có thể hết hạn giao dịch đang chờ xử lý. Trạng thái hiện tại: " + this.status);
        }
        this.status = PaymentStatus.EXPIRED;
    }

    /**
     * Process refund by admin.
     * State guard: only COMPLETED → REFUNDED is allowed.
     */
    public void refund(String reason, String adminNote) {
        if (this.status != PaymentStatus.COMPLETED) {
            throw new BusinessRuleException(
                    "Chỉ có thể hoàn tiền giao dịch đã hoàn thành. Trạng thái hiện tại: " + this.status);
        }
        if ("COMPLETED".equals(this.refundStatus)) {
            throw new BusinessRuleException("Giao dịch này đã được hoàn tiền");
        }

        this.status = PaymentStatus.REFUNDED;
        this.refundStatus = "COMPLETED";
        this.refundReason = reason;
        this.refundAdminNote = adminNote;
        this.refundRequestedAt = Instant.now();
        this.refundCompletedAt = Instant.now();
    }

    /**
     * Validate IPN amount matches stored amount.
     */
    public boolean isAmountMatch(BigDecimal ipnAmount) {
        return ipnAmount != null && ipnAmount.compareTo(this.amount) == 0;
    }

    public void setVnpMetadata(String transactionNo, String bankCode, String responseCode, String cardType) {
        this.vnpTransactionNo = transactionNo;
        this.vnpBankCode = bankCode;
        this.vnpResponseCode = responseCode;
        this.vnpCardType = cardType;
    }

    public boolean isCompleted() {
        return this.status == PaymentStatus.COMPLETED;
    }

    public boolean isPending() {
        return this.status == PaymentStatus.PENDING;
    }

    // ==================== Getters ====================

    public UUID getId() { return id; }
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
    public String getRefundStatus() { return refundStatus; }
    public Instant getRefundRequestedAt() { return refundRequestedAt; }
    public Instant getRefundCompletedAt() { return refundCompletedAt; }
    public String getRefundReason() { return refundReason; }
    public String getRefundAdminNote() { return refundAdminNote; }
    public Long getVersion() { return version; }

    /**
     * Reconstitution factory — used by infrastructure mapper to rebuild domain model from persistence.
     * This is the ONLY way to create a PaymentTransaction from existing data (not via business factory methods).
     */
    public static PaymentTransaction reconstitute(
            UUID id, UUID studentId, UUID courseId, BigDecimal amount, String currency,
            String paymentMethod, String transactionId, PaymentStatus status,
            Instant paidAt, Instant createdAt,
            String vnpTransactionNo, String vnpBankCode, String vnpResponseCode, String vnpCardType,
            String refundStatus, Instant refundRequestedAt, Instant refundCompletedAt,
            String refundReason, String refundAdminNote, Long version
    ) {
        var p = new PaymentTransaction();
        p.id = id;
        p.studentId = studentId;
        p.courseId = courseId;
        p.amount = amount;
        p.currency = currency;
        p.paymentMethod = paymentMethod;
        p.transactionId = transactionId;
        p.status = status;
        p.paidAt = paidAt;
        p.createdAt = createdAt;
        p.vnpTransactionNo = vnpTransactionNo;
        p.vnpBankCode = vnpBankCode;
        p.vnpResponseCode = vnpResponseCode;
        p.vnpCardType = vnpCardType;
        p.refundStatus = refundStatus;
        p.refundRequestedAt = refundRequestedAt;
        p.refundCompletedAt = refundCompletedAt;
        p.refundReason = refundReason;
        p.refundAdminNote = refundAdminNote;
        p.version = version;
        return p;
    }

    public enum PaymentStatus {
        PENDING, COMPLETED, FAILED, REFUNDED, EXPIRED
    }
}
