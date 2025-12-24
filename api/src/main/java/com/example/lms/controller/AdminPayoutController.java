package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.TeacherPayout;
import com.example.lms.entity.User;
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

import java.util.List;
import java.util.UUID;

/**
 * Controller for admin payout management
 * 
 * Endpoints:
 * - GET /api/v1/admin/payouts/pending - Pending payout requests
 * - GET /api/v1/admin/payouts/all - All payouts
 * - GET /api/v1/admin/payouts/stats - Payout statistics
 * - POST /api/v1/admin/payouts/{id}/approve - Approve payout
 * - POST /api/v1/admin/payouts/{id}/reject - Reject payout
 * - POST /api/v1/admin/payouts/{id}/complete - Complete payout (after transfer)
 */
@RestController
@RequestMapping("/api/v1/admin/payouts")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Admin Payouts", description = "APIs for admin payout management")
@PreAuthorize("hasRole('ADMIN')")
public class AdminPayoutController {

    private final TeacherPayoutService payoutService;

    /**
     * Get pending payout requests
     */
    @GetMapping("/pending")
    @Operation(summary = "Pending Payouts", description = "Get all pending payout requests for review")
    public ResponseEntity<ApiResponse<List<PayoutResponse>>> getPendingPayouts(Pageable pageable) {
        log.info("Get pending payouts");

        Page<TeacherPayout> page = payoutService.getPendingPayouts(pageable);
        List<PayoutResponse> responses = page.getContent().stream()
                .map(PayoutResponse::from)
                .toList();

        return ResponseEntity.ok(ApiResponse.successPage(page.map(PayoutResponse::from)));
    }

    /**
     * Get all payouts (for admin dashboard)
     */
    @GetMapping("/all")
    @Operation(summary = "All Payouts", description = "Get all payouts with pagination")
    public ResponseEntity<ApiResponse<List<PayoutResponse>>> getAllPayouts(Pageable pageable) {
        log.info("Get all payouts");

        Page<TeacherPayout> page = payoutService.getAllPayouts(pageable);
        return ResponseEntity.ok(ApiResponse.successPage(page.map(PayoutResponse::from)));
    }

    /**
     * Get payout statistics
     */
    @GetMapping("/stats")
    @Operation(summary = "Payout Statistics", description = "Get payout statistics for dashboard")
    public ResponseEntity<ApiResponse<PayoutStats>> getPayoutStats() {
        log.info("Get payout stats");

        PayoutStats stats = payoutService.getPayoutStats();
        return ResponseEntity.ok(ApiResponse.success(stats, "Thống kê thanh toán"));
    }

    /**
     * Approve a payout request
     */
    @PostMapping("/{payoutId}/approve")
    @Operation(summary = "Approve Payout", description = "Approve a pending payout request")
    public ResponseEntity<ApiResponse<PayoutResponse>> approvePayout(
            @PathVariable UUID payoutId,
            @AuthenticationPrincipal User currentAdmin
    ) {
        log.info("Approve payout: payoutId={}, adminId={}", payoutId, currentAdmin.getId());

        try {
            TeacherPayout payout = payoutService.approvePayout(payoutId, currentAdmin.getId());
            PayoutResponse response = PayoutResponse.from(payout);
            return ResponseEntity.ok(ApiResponse.success(response, "Yêu cầu rút tiền đã được duyệt"));

        } catch (RuntimeException e) {
            log.error("Approve payout failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Reject a payout request
     */
    @PostMapping("/{payoutId}/reject")
    @Operation(summary = "Reject Payout", description = "Reject a pending payout request")
    public ResponseEntity<ApiResponse<PayoutResponse>> rejectPayout(
            @PathVariable UUID payoutId,
            @AuthenticationPrincipal User currentAdmin,
            @RequestBody RejectRequest request
    ) {
        log.info("Reject payout: payoutId={}, adminId={}, reason={}", 
                payoutId, currentAdmin.getId(), request.reason());

        try {
            TeacherPayout payout = payoutService.rejectPayout(
                    payoutId, 
                    currentAdmin.getId(), 
                    request.reason()
            );
            PayoutResponse response = PayoutResponse.from(payout);
            return ResponseEntity.ok(ApiResponse.success(response, "Yêu cầu rút tiền đã bị từ chối"));

        } catch (RuntimeException e) {
            log.error("Reject payout failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Complete a payout (after manual transfer)
     */
    @PostMapping("/{payoutId}/complete")
    @Operation(summary = "Complete Payout", description = "Mark payout as completed after transfer")
    public ResponseEntity<ApiResponse<PayoutResponse>> completePayout(
            @PathVariable UUID payoutId,
            @AuthenticationPrincipal User currentAdmin
    ) {
        log.info("Complete payout: payoutId={}, adminId={}", payoutId, currentAdmin.getId());

        try {
            TeacherPayout payout = payoutService.completePayout(payoutId);
            PayoutResponse response = PayoutResponse.from(payout);
            return ResponseEntity.ok(ApiResponse.success(response, "Thanh toán đã hoàn thành"));

        } catch (RuntimeException e) {
            log.error("Complete payout failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // ============ DTOs ============

    public record RejectRequest(String reason) {}
}
