package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * TeacherPayout entity - Manages payout requests from teachers
 * 
 * Workflow:
 * 1. Teacher requests payout (REQUESTED)
 * 2. Admin reviews and approves/rejects (APPROVED/REJECTED)
 * 3. System processes transfer (PROCESSING)
 * 4. Transfer completed (COMPLETED)
 */
@Entity
@Table(name = "teacher_payouts")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class TeacherPayout {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PayoutStatus status = PayoutStatus.REQUESTED;

    @Enumerated(EnumType.STRING)
    @Column(name = "payout_method", nullable = false, length = 50)
    private PayoutMethod payoutMethod;

    @Column(name = "requested_at", nullable = false)
    @Builder.Default
    private Instant requestedAt = Instant.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(length = 500)
    private String notes;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    // ============ Enums ============

    public enum PayoutStatus {
        REQUESTED,   // Teacher submitted request
        APPROVED,    // Admin approved
        REJECTED,    // Admin rejected
        PROCESSING,  // Transfer in progress
        COMPLETED    // Transfer completed
    }

    public enum PayoutMethod {
        BANK_TRANSFER,
        PAYPAL,
        MOMO,
        ZALOPAY,
        VNPAY
    }

    // ============ Domain Methods ============

    /**
     * Admin approves the payout request
     */
    public void approve(User admin) {
        if (this.status != PayoutStatus.REQUESTED) {
            throw new IllegalStateException("Can only approve REQUESTED payouts");
        }
        this.status = PayoutStatus.APPROVED;
        this.approvedBy = admin;
        this.approvedAt = Instant.now();
    }

    /**
     * Admin rejects the payout request
     */
    public void reject(User admin, String reason) {
        if (this.status != PayoutStatus.REQUESTED) {
            throw new IllegalStateException("Can only reject REQUESTED payouts");
        }
        this.status = PayoutStatus.REJECTED;
        this.approvedBy = admin;
        this.approvedAt = Instant.now();
        this.rejectionReason = reason;
    }

    /**
     * Start processing the payout
     */
    public void startProcessing() {
        if (this.status != PayoutStatus.APPROVED) {
            throw new IllegalStateException("Can only process APPROVED payouts");
        }
        this.status = PayoutStatus.PROCESSING;
    }

    /**
     * Complete the payout transfer
     */
    public void complete() {
        if (this.status != PayoutStatus.PROCESSING) {
            throw new IllegalStateException("Can only complete PROCESSING payouts");
        }
        this.status = PayoutStatus.COMPLETED;
        this.completedAt = Instant.now();
    }

    /**
     * Check if payout is pending admin action
     */
    public boolean isPending() {
        return this.status == PayoutStatus.REQUESTED;
    }

    /**
     * Check if payout is finalized (completed or rejected)
     */
    public boolean isFinalized() {
        return this.status == PayoutStatus.COMPLETED || this.status == PayoutStatus.REJECTED;
    }

    /**
     * Factory method to create a new payout request
     */
    public static TeacherPayout request(User teacher, BigDecimal amount, PayoutMethod method) {
        return TeacherPayout.builder()
                .teacher(teacher)
                .amount(amount)
                .payoutMethod(method)
                .status(PayoutStatus.REQUESTED)
                .requestedAt(Instant.now())
                .build();
    }
}
