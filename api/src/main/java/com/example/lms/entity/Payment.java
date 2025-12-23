package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Payment entity - Lưu trữ thông tin thanh toán khóa học
 * 
 * Logic:
 * - Mỗi student chỉ có 1 payment record cho 1 course (unique constraint)
 * - Status COMPLETED = đã thanh toán, mở full khóa học
 * - Status PENDING/FAILED = chưa thanh toán, chỉ mở 2 bài đầu
 */
@Entity
@Table(name = "payments", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "course_id"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    @Column(name = "payment_method", length = 50)
    private String paymentMethod; // CARD, BANK_TRANSFER, MOMO, etc.

    @Column(name = "transaction_id", length = 100)
    private String transactionId; // For tracking/reference

    @Column(name = "paid_at")
    private Instant paidAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "notes", length = 500)
    private String notes;

    /**
     * Payment status enum
     */
    public enum PaymentStatus {
        PENDING,    // Chờ thanh toán
        COMPLETED,  // Đã thanh toán thành công
        FAILED,     // Thanh toán thất bại
        REFUNDED    // Đã hoàn tiền
    }

    // ============ Domain Methods ============

    /**
     * Complete payment (giả lập)
     */
    public void complete() {
        this.status = PaymentStatus.COMPLETED;
        this.paidAt = Instant.now();
    }

    /**
     * Mark as failed
     */
    public void fail(String reason) {
        this.status = PaymentStatus.FAILED;
        this.notes = reason;
    }

    /**
     * Check if payment is valid (completed)
     */
    public boolean isValid() {
        return this.status == PaymentStatus.COMPLETED;
    }
}
