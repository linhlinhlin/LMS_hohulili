package com.example.lms.shared.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.application.usecase.GetTeacherRevenueUseCase;
import com.example.lms.shared.application.usecase.RequestPayoutUseCase;
import com.example.lms.shared.domain.model.PayoutRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v3/teacher")
@RequiredArgsConstructor
@Tag(name = "Teacher Revenue", description = "Teacher revenue dashboard and payout management")
@SecurityRequirement(name = "bearerAuth")
public class TeacherRevenueControllerV3 {

    private final GetTeacherRevenueUseCase revenueUseCase;
    private final RequestPayoutUseCase     requestPayoutUseCase;

    @GetMapping("/revenue/summary")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Get teacher revenue summary (total, this month, growth)")
    public ResponseEntity<ApiResponse<GetTeacherRevenueUseCase.RevenueSummaryDto>> getSummary(
            @AuthenticationPrincipal UserJpaEntity user) {
        var summary = revenueUseCase.getSummary(user.getId());
        return ResponseEntity.ok(ApiResponse.success(summary, "Doanh thu tổng quan"));
    }

    @GetMapping("/revenue/history")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Get paginated revenue split history")
    public ResponseEntity<ApiResponse<Page<GetTeacherRevenueUseCase.RevenueSplitDto>>> getHistory(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var history = revenueUseCase.getHistory(user.getId(), page, size);
        return ResponseEntity.ok(ApiResponse.success(history, "Lịch sử doanh thu"));
    }

    @GetMapping("/payout/balance")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Get teacher payout balance (available, pending, withdrawn)")
    public ResponseEntity<ApiResponse<GetTeacherRevenueUseCase.PayoutBalanceDto>> getBalance(
            @AuthenticationPrincipal UserJpaEntity user) {
        var balance = revenueUseCase.getBalance(user.getId());
        return ResponseEntity.ok(ApiResponse.success(balance, "Số dư rút tiền"));
    }

    @GetMapping("/payout/history")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Get paginated payout request history for the authenticated teacher")
    public ResponseEntity<ApiResponse<Page<GetTeacherRevenueUseCase.PayoutHistoryDto>>> getPayoutHistory(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var history = revenueUseCase.getPayoutHistory(user.getId(), page, size);
        return ResponseEntity.ok(ApiResponse.success(history, "Lịch sử rút tiền"));
    }

    @PostMapping("/payout/request")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Create a payout withdrawal request")
    public ResponseEntity<ApiResponse<Map<String, String>>> requestPayout(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestBody PayoutRequestBody body) {
        PayoutRequest saved = requestPayoutUseCase.execute(
                user.getId(),
                UUID.fromString(body.bankAccountId()),
                BigDecimal.valueOf(body.amount()),
                body.teacherNote());
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("payoutId", saved.getId().toString()),
                "Yêu cầu rút tiền đã được gửi"));
    }

    @DeleteMapping("/payout/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Cancel a PENDING payout request")
    public ResponseEntity<ApiResponse<Map<String, String>>> cancelPayout(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserJpaEntity user) {
        requestPayoutUseCase.cancel(id, user.getId());
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("payoutId", id.toString()), "Đã hủy yêu cầu rút tiền"));
    }

    public record PayoutRequestBody(
            String bankAccountId,
            double amount,
            String teacherNote
    ) {}
}
