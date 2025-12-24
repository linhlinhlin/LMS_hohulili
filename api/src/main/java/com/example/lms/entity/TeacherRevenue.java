package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * TeacherRevenue entity - Tracks teacher earnings from course sales
 * 
 * Revenue Model (Udemy-style):
 * - REFERRAL: Teacher gets 97%, Platform gets 3% (teacher promoted the sale)
 * - ORGANIC: Teacher gets 70%, Platform gets 30% (marketplace sale)
 * 
 * Status Flow:
 * - PENDING: Within hold period (30 days for refund protection)
 * - AVAILABLE: Ready for payout
 * - PAID_OUT: Included in a completed payout
 */
@Entity
@Table(name = "teacher_revenues")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class TeacherRevenue {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id", nullable = false, unique = true)
    private Payment payment;

    @Column(name = "gross_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal grossAmount;

    @Column(name = "platform_fee", nullable = false, precision = 19, scale = 2)
    private BigDecimal platformFee;

    @Column(name = "net_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal netAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "sale_type", nullable = false, length = 20)
    @Builder.Default
    private SaleType saleType = SaleType.ORGANIC;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RevenueStatus status = RevenueStatus.PENDING;

    @Column(name = "available_at")
    private Instant availableAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    // ============ Enums ============

    public enum SaleType {
        REFERRAL,  // Teacher promoted (97% share)
        ORGANIC    // Marketplace sale (70% share)
    }

    public enum RevenueStatus {
        PENDING,    // Within hold period
        AVAILABLE,  // Ready for payout
        PAID_OUT    // Included in a payout
    }

    // ============ Domain Methods ============

    /**
     * Check if revenue is available for payout
     */
    public boolean isAvailable() {
        return this.status == RevenueStatus.AVAILABLE;
    }

    /**
     * Make revenue available for payout (after hold period)
     */
    public void makeAvailable() {
        if (this.status == RevenueStatus.PENDING) {
            this.status = RevenueStatus.AVAILABLE;
        }
    }

    /**
     * Mark as included in a payout
     */
    public void markPaidOut() {
        if (this.status == RevenueStatus.AVAILABLE) {
            this.status = RevenueStatus.PAID_OUT;
        }
    }

    /**
     * Calculate commission rates based on sale type
     */
    public static BigDecimal getPlatformFeeRate(SaleType saleType) {
        return switch (saleType) {
            case REFERRAL -> new BigDecimal("0.03");  // 3% platform fee
            case ORGANIC -> new BigDecimal("0.30");   // 30% platform fee
        };
    }

    /**
     * Factory method to create revenue from a payment
     */
    public static TeacherRevenue fromPayment(Payment payment, SaleType saleType, int holdDays) {
        BigDecimal grossAmount = payment.getAmount();
        BigDecimal feeRate = getPlatformFeeRate(saleType);
        BigDecimal platformFee = grossAmount.multiply(feeRate);
        BigDecimal netAmount = grossAmount.subtract(platformFee);

        return TeacherRevenue.builder()
                .teacher(payment.getCourse().getTeacher())
                .payment(payment)
                .grossAmount(grossAmount)
                .platformFee(platformFee)
                .netAmount(netAmount)
                .saleType(saleType)
                .status(RevenueStatus.PENDING)
                .availableAt(Instant.now().plusSeconds(holdDays * 24L * 60 * 60))
                .build();
    }
}
