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

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public PaymentTransactionJpaEntity() {}

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID id;
        private UUID studentId;
        private UUID courseId;
        private BigDecimal amount = BigDecimal.ZERO;
        private String currency = "VND";
        private String paymentMethod = "SIMULATED";
        private String transactionId;
        private PaymentStatus status = PaymentStatus.PENDING;
        private Instant paidAt;

        public Builder id(UUID id) { this.id = id; return this; }
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
            e.id = id; e.studentId = studentId; e.courseId = courseId; e.amount = amount;
            e.currency = currency; e.paymentMethod = paymentMethod; e.transactionId = transactionId;
            e.status = status; e.paidAt = paidAt;
            return e;
        }
    }

    // Getters
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

    // Setters
    public void setStatus(PaymentStatus status) { this.status = status; }
    public void setPaidAt(Instant paidAt) { this.paidAt = paidAt; }

    public enum PaymentStatus {
        PENDING, COMPLETED, FAILED, REFUNDED
    }
}
