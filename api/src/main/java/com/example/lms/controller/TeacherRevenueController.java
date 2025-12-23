package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.TeacherPayout.PayoutMethod;
import com.example.lms.entity.TeacherRevenue;
import com.example.lms.entity.TeacherPayout;
import com.example.lms.entity.User;
import com.example.lms.service.TeacherRevenueService;
import com.example.lms.service.TeacherRevenueService.*;
import com.example.lms.service.TeacherPayoutService;
import com.example.lms.service.TeacherPayoutService.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Controller for teacher revenue and payout management
 * 
 * Endpoints:
 * - GET /api/v1/teacher/revenue/summary - Revenue dashboard
 * - GET /api/v1/teacher/revenue/history - Revenue history
 * - GET /api/v1/teacher/payout/balance - Available balance
 * - POST /api/v1/teacher/payout/request - Request payout
 * - GET /api/v1/teacher/payout/history - Payout history
 */
@RestController
@RequestMapping("/api/v1/teacher")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Teacher Revenue", description = "APIs for teacher revenue and payout management")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherRevenueController {

    private final TeacherRevenueService revenueService;
    private final TeacherPayoutService payoutService;

    // ============ Revenue Endpoints ============

    /**
     * Get revenue summary (dashboard)
     */
    @GetMapping("/revenue/summary")
    @Operation(summary = "Revenue Dashboard", description = "Get teacher's revenue summary including total earnings, available and pending balance")
    public ResponseEntity<ApiResponse<RevenueSummary>> getRevenueSummary(
            @AuthenticationPrincipal User currentUser
    ) {
        log.info("Get revenue summary: teacherId={}", currentUser.getId());

        RevenueSummary summary = revenueService.getRevenueSummary(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(summary, "Tổng quan doanh thu"));
    }

    /**
     * Get revenue history (paginated)
     */
    @GetMapping("/revenue/history")
    @Operation(summary = "Revenue History", description = "Get detailed revenue history with pagination")
    public ResponseEntity<ApiResponse<List<RevenueResponse>>> getRevenueHistory(
            @AuthenticationPrincipal User currentUser,
            Pageable pageable
    ) {
        log.info("Get revenue history: teacherId={}", currentUser.getId());

        Page<TeacherRevenue> page = revenueService.getRevenueHistory(currentUser.getId(), pageable);
        List<RevenueResponse> responses = page.getContent().stream()
                .map(RevenueResponse::from)
                .toList();

        return ResponseEntity.ok(ApiResponse.successPage(page.map(RevenueResponse::from)));
    }

    // ============ Payout Endpoints ============

    /**
     * Get available balance for payout
     */
    @GetMapping("/payout/balance")
    @Operation(summary = "Available Balance", description = "Get balance available for payout withdrawal")
    public ResponseEntity<ApiResponse<BalanceResponse>> getAvailableBalance(
            @AuthenticationPrincipal User currentUser
    ) {
        log.info("Get available balance: teacherId={}", currentUser.getId());

        BigDecimal balance = revenueService.getAvailableBalance(currentUser.getId());
        boolean hasPendingRequest = payoutService.getPayoutHistory(currentUser.getId()).stream()
                .anyMatch(p -> p.getStatus() == TeacherPayout.PayoutStatus.REQUESTED);

        BalanceResponse response = new BalanceResponse(
                currentUser.getId(),
                balance,
                hasPendingRequest,
                new BigDecimal("100000") // Minimum payout amount
        );

        return ResponseEntity.ok(ApiResponse.success(response, "Số dư khả dụng"));
    }

    /**
     * Request a payout
     */
    @PostMapping("/payout/request")
    @Operation(summary = "Request Payout", description = "Submit a payout withdrawal request")
    public ResponseEntity<ApiResponse<PayoutResponse>> requestPayout(
            @AuthenticationPrincipal User currentUser,
            @RequestBody PayoutRequest request
    ) {
        log.info("Payout request: teacherId={}, amount={}, method={}", 
                currentUser.getId(), request.amount(), request.payoutMethod());

        try {
            TeacherPayout payout = payoutService.requestPayout(
                    currentUser.getId(),
                    request.amount(),
                    request.payoutMethod()
            );

            PayoutResponse response = PayoutResponse.from(payout);
            return ResponseEntity.ok(ApiResponse.success(response, "Yêu cầu rút tiền đã được gửi"));

        } catch (IllegalStateException | IllegalArgumentException e) {
            log.warn("Payout request failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Get payout history
     */
    @GetMapping("/payout/history")
    @Operation(summary = "Payout History", description = "Get history of payout requests")
    public ResponseEntity<ApiResponse<List<PayoutResponse>>> getPayoutHistory(
            @AuthenticationPrincipal User currentUser,
            Pageable pageable
    ) {
        log.info("Get payout history: teacherId={}", currentUser.getId());

        Page<TeacherPayout> page = payoutService.getPayoutHistory(currentUser.getId(), pageable);
        List<PayoutResponse> responses = page.getContent().stream()
                .map(PayoutResponse::from)
                .toList();

        return ResponseEntity.ok(ApiResponse.successPage(page.map(PayoutResponse::from)));
    }

    // ============ DTOs ============

    public record BalanceResponse(
            java.util.UUID teacherId,
            BigDecimal availableBalance,
            boolean hasPendingRequest,
            BigDecimal minimumPayout
    ) {}
}
