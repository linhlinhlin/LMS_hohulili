package com.example.lms.service;

import com.example.lms.entity.TeacherPayout;
import com.example.lms.entity.TeacherPayout.PayoutMethod;
import com.example.lms.entity.TeacherPayout.PayoutStatus;
import com.example.lms.entity.User;
import com.example.lms.repository.TeacherPayoutRepository;
import com.example.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Service for managing teacher payout requests
 * 
 * Workflow:
 * 1. Teacher requests payout → REQUESTED
 * 2. Admin approves → APPROVED → PROCESSING → COMPLETED
 *    OR Admin rejects → REJECTED
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TeacherPayoutService {

    private final TeacherPayoutRepository payoutRepository;
    private final TeacherRevenueService revenueService;
    private final UserRepository userRepository;

    // Minimum payout amount (configurable)
    private static final BigDecimal MINIMUM_PAYOUT = new BigDecimal("100000"); // 100,000 VND

    // ============ Teacher Methods ============

    /**
     * Teacher requests a payout
     */
    @Transactional
    public TeacherPayout requestPayout(UUID teacherId, BigDecimal amount, PayoutMethod method) {
        log.info("Payout request: teacherId={}, amount={}, method={}", teacherId, amount, method);

        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new RuntimeException("Teacher not found: " + teacherId));

        // Check if teacher already has a pending request
        if (payoutRepository.hasPendingRequest(teacherId)) {
            throw new IllegalStateException("You already have a pending payout request");
        }

        // Check minimum amount
        if (amount.compareTo(MINIMUM_PAYOUT) < 0) {
            throw new IllegalArgumentException("Minimum payout amount is " + MINIMUM_PAYOUT);
        }

        // Check available balance
        BigDecimal availableBalance = revenueService.getAvailableBalance(teacherId);
        if (amount.compareTo(availableBalance) > 0) {
            throw new IllegalArgumentException("Insufficient balance. Available: " + availableBalance);
        }

        // Create payout request
        TeacherPayout payout = TeacherPayout.request(teacher, amount, method);
        TeacherPayout saved = payoutRepository.save(payout);

        log.info("Payout requested: payoutId={}", saved.getId());
        return saved;
    }

    /**
     * Get payout history for a teacher
     */
    @Transactional(readOnly = true)
    public List<TeacherPayout> getPayoutHistory(UUID teacherId) {
        return payoutRepository.findByTeacherIdOrderByRequestedAtDesc(teacherId);
    }

    /**
     * Get payout history with pagination
     */
    @Transactional(readOnly = true)
    public Page<TeacherPayout> getPayoutHistory(UUID teacherId, Pageable pageable) {
        return payoutRepository.findByTeacherIdOrderByRequestedAtDesc(teacherId, pageable);
    }

    // ============ Admin Methods ============

    /**
     * Get pending payout requests (for admin)
     */
    @Transactional(readOnly = true)
    public List<TeacherPayout> getPendingPayouts() {
        return payoutRepository.getPendingPayouts();
    }

    /**
     * Get pending payouts with pagination
     */
    @Transactional(readOnly = true)
    public Page<TeacherPayout> getPendingPayouts(Pageable pageable) {
        return payoutRepository.findByStatusOrderByRequestedAtAsc(PayoutStatus.REQUESTED, pageable);
    }

    /**
     * Get all payouts (for admin dashboard)
     */
    @Transactional(readOnly = true)
    public Page<TeacherPayout> getAllPayouts(Pageable pageable) {
        return payoutRepository.findAll(pageable);
    }

    /**
     * Admin approves a payout request
     */
    @Transactional
    public TeacherPayout approvePayout(UUID payoutId, UUID adminId) {
        log.info("Approving payout: payoutId={}, adminId={}", payoutId, adminId);

        TeacherPayout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new RuntimeException("Payout not found: " + payoutId));

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Admin not found: " + adminId));

        payout.approve(admin);
        TeacherPayout saved = payoutRepository.save(payout);

        log.info("Payout approved: payoutId={}", payoutId);
        return saved;
    }

    /**
     * Admin rejects a payout request
     */
    @Transactional
    public TeacherPayout rejectPayout(UUID payoutId, UUID adminId, String reason) {
        log.info("Rejecting payout: payoutId={}, adminId={}, reason={}", payoutId, adminId, reason);

        TeacherPayout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new RuntimeException("Payout not found: " + payoutId));

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Admin not found: " + adminId));

        payout.reject(admin, reason);
        TeacherPayout saved = payoutRepository.save(payout);

        log.info("Payout rejected: payoutId={}", payoutId);
        return saved;
    }

    /**
     * Complete a payout (after transfer is done)
     */
    @Transactional
    public TeacherPayout completePayout(UUID payoutId) {
        log.info("Completing payout: payoutId={}", payoutId);

        TeacherPayout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new RuntimeException("Payout not found: " + payoutId));

        // Start processing first if not already
        if (payout.getStatus() == PayoutStatus.APPROVED) {
            payout.startProcessing();
        }

        payout.complete();

        // Mark corresponding revenues as paid out
        revenueService.markRevenuesAsPaidOut(payout.getTeacher().getId(), payout.getAmount());

        TeacherPayout saved = payoutRepository.save(payout);
        log.info("Payout completed: payoutId={}", payoutId);
        return saved;
    }

    /**
     * Get payout statistics (for admin dashboard)
     */
    @Transactional(readOnly = true)
    public PayoutStats getPayoutStats() {
        long pendingCount = payoutRepository.countPendingPayouts();
        BigDecimal totalCompleted = payoutRepository.sumTotalCompletedPayouts();

        return new PayoutStats(pendingCount, totalCompleted);
    }

    // ============ DTOs ============

    public record PayoutStats(
            long pendingCount,
            BigDecimal totalCompletedAmount
    ) {}

    public record PayoutResponse(
            UUID id,
            UUID teacherId,
            String teacherName,
            BigDecimal amount,
            String status,
            String payoutMethod,
            String requestedAt,
            String approvedAt,
            String completedAt,
            String rejectionReason
    ) {
        public static PayoutResponse from(TeacherPayout payout) {
            return new PayoutResponse(
                    payout.getId(),
                    payout.getTeacher().getId(),
                    payout.getTeacher().getFullName(),
                    payout.getAmount(),
                    payout.getStatus().name(),
                    payout.getPayoutMethod().name(),
                    payout.getRequestedAt() != null ? payout.getRequestedAt().toString() : null,
                    payout.getApprovedAt() != null ? payout.getApprovedAt().toString() : null,
                    payout.getCompletedAt() != null ? payout.getCompletedAt().toString() : null,
                    payout.getRejectionReason()
            );
        }
    }

    public record PayoutRequest(
            BigDecimal amount,
            PayoutMethod payoutMethod
    ) {}
}
