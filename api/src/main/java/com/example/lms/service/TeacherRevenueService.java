package com.example.lms.service;

import com.example.lms.entity.Payment;
import com.example.lms.entity.TeacherRevenue;
import com.example.lms.entity.TeacherRevenue.RevenueStatus;
import com.example.lms.entity.TeacherRevenue.SaleType;
import com.example.lms.repository.TeacherRevenueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Service for managing teacher revenue from course sales
 * 
 * Revenue Model:
 * - REFERRAL: Teacher 97%, Platform 3%
 * - ORGANIC: Teacher 70%, Platform 30%
 * 
 * Hold Period: 30 days (configurable)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TeacherRevenueService {

    private final TeacherRevenueRepository revenueRepository;

    // Configuration: Hold period before revenue becomes available (30 days)
    private static final int HOLD_PERIOD_DAYS = 30;

    // ============ Core Methods ============

    /**
     * Record revenue when a payment is completed
     */
    @Transactional
    public TeacherRevenue recordRevenue(Payment payment, SaleType saleType) {
        log.info("Recording revenue for payment: paymentId={}, teacherId={}, saleType={}",
                payment.getId(), payment.getCourse().getTeacher().getId(), saleType);

        // Check if revenue already recorded for this payment
        if (revenueRepository.findByPaymentId(payment.getId()).isPresent()) {
            log.warn("Revenue already recorded for payment: {}", payment.getId());
            throw new IllegalStateException("Revenue already recorded for this payment");
        }

        // Create revenue record using factory method
        TeacherRevenue revenue = TeacherRevenue.fromPayment(payment, saleType, HOLD_PERIOD_DAYS);
        TeacherRevenue saved = revenueRepository.save(revenue);

        log.info("Revenue recorded: revenueId={}, grossAmount={}, netAmount={}", 
                saved.getId(), saved.getGrossAmount(), saved.getNetAmount());

        return saved;
    }

    /**
     * Get revenue summary for a teacher
     */
    @Transactional(readOnly = true)
    public RevenueSummary getRevenueSummary(UUID teacherId) {
        BigDecimal totalEarnings = revenueRepository.getTotalEarnings(teacherId);
        BigDecimal availableBalance = revenueRepository.getAvailableBalance(teacherId);
        BigDecimal pendingBalance = revenueRepository.getPendingBalance(teacherId);
        BigDecimal totalSales = revenueRepository.sumGrossAmountByTeacherId(teacherId);
        long totalTransactions = revenueRepository.findByTeacherIdOrderByCreatedAtDesc(teacherId).size();

        return new RevenueSummary(
                teacherId,
                totalEarnings,
                availableBalance,
                pendingBalance,
                totalSales,
                totalTransactions
        );
    }

    /**
     * Get revenue history with pagination
     */
    @Transactional(readOnly = true)
    public Page<TeacherRevenue> getRevenueHistory(UUID teacherId, Pageable pageable) {
        return revenueRepository.findByTeacherIdOrderByCreatedAtDesc(teacherId, pageable);
    }

    /**
     * Get available balance for payout
     */
    @Transactional(readOnly = true)
    public BigDecimal getAvailableBalance(UUID teacherId) {
        return revenueRepository.getAvailableBalance(teacherId);
    }

    /**
     * Mark revenues as paid out (called when payout is completed)
     */
    @Transactional
    public void markRevenuesAsPaidOut(UUID teacherId, BigDecimal amount) {
        log.info("Marking revenues as paid out: teacherId={}, amount={}", teacherId, amount);

        List<TeacherRevenue> availableRevenues = revenueRepository
                .findByTeacherIdAndStatus(teacherId, RevenueStatus.AVAILABLE);

        BigDecimal remaining = amount;
        for (TeacherRevenue revenue : availableRevenues) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;

            if (revenue.getNetAmount().compareTo(remaining) <= 0) {
                revenue.markPaidOut();
                remaining = remaining.subtract(revenue.getNetAmount());
            }
        }

        revenueRepository.saveAll(availableRevenues);
        log.info("Marked revenues as paid out for teacherId={}", teacherId);
    }

    /**
     * Process pending revenues that are past hold period
     * This could be called by a scheduled job
     */
    @Transactional
    public int processHoldPeriodExpiry() {
        List<TeacherRevenue> expiredRevenues = revenueRepository
                .findPendingRevenuesReadyForAvailability(Instant.now());

        for (TeacherRevenue revenue : expiredRevenues) {
            revenue.makeAvailable();
        }

        if (!expiredRevenues.isEmpty()) {
            revenueRepository.saveAll(expiredRevenues);
            log.info("Processed {} revenues past hold period", expiredRevenues.size());
        }

        return expiredRevenues.size();
    }

    // ============ DTOs ============

    public record RevenueSummary(
            UUID teacherId,
            BigDecimal totalEarnings,
            BigDecimal availableBalance,
            BigDecimal pendingBalance,
            BigDecimal totalSales,
            long totalTransactions
    ) {}

    public record RevenueResponse(
            UUID id,
            UUID paymentId,
            String courseTitle,
            BigDecimal grossAmount,
            BigDecimal platformFee,
            BigDecimal netAmount,
            String saleType,
            String status,
            String availableAt,
            String createdAt
    ) {
        public static RevenueResponse from(TeacherRevenue revenue) {
            return new RevenueResponse(
                    revenue.getId(),
                    revenue.getPayment().getId(),
                    revenue.getPayment().getCourse().getTitle(),
                    revenue.getGrossAmount(),
                    revenue.getPlatformFee(),
                    revenue.getNetAmount(),
                    revenue.getSaleType().name(),
                    revenue.getStatus().name(),
                    revenue.getAvailableAt() != null ? revenue.getAvailableAt().toString() : null,
                    revenue.getCreatedAt() != null ? revenue.getCreatedAt().toString() : null
            );
        }
    }
}
