package com.example.lms.shared.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.application.usecase.GetTeacherRevenueUseCase;
import com.example.lms.shared.application.usecase.ProcessPayoutUseCase;
import com.example.lms.shared.domain.model.PayoutRequest;
import com.example.lms.shared.domain.repository.PayoutRequestRepository;
import com.example.lms.shared.domain.repository.RevenueSplitRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v3/admin/revenue")
@RequiredArgsConstructor
@Tag(name = "Admin Revenue", description = "Platform revenue overview and payout management")
@SecurityRequirement(name = "bearerAuth")
public class AdminRevenueControllerV3 {

    private final ProcessPayoutUseCase    processPayoutUseCase;
    private final PayoutRequestRepository payoutRepo;
    private final RevenueSplitRepository  splitRepo;

    // ── Payout management ─────────────────────────────────────────────────

    @GetMapping("/payouts")
    @PreAuthorize("hasAnyRole('ADMIN','ORG_ADMIN')")
    @Operation(summary = "List payout requests filtered by status")
    public ResponseEntity<ApiResponse<Page<PayoutListDto>>> listPayouts(
            @RequestParam(defaultValue = "PENDING") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var payouts = payoutRepo.findAllByStatus(status, PageRequest.of(page, size))
                .map(this::toDto);
        return ResponseEntity.ok(ApiResponse.success(payouts, "Danh sách yêu cầu rút tiền"));
    }

    @PostMapping("/payouts/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','ORG_ADMIN')")
    @Operation(summary = "Approve a payout request")
    public ResponseEntity<ApiResponse<PayoutListDto>> approve(
            @PathVariable UUID id,
            @RequestBody(required = false) AdminNoteBody body,
            @AuthenticationPrincipal UserJpaEntity admin) {
        var result = processPayoutUseCase.approve(id, admin.getId(),
                body != null ? body.adminNote() : null);
        return ResponseEntity.ok(ApiResponse.success(toDto(result), "Đã duyệt yêu cầu rút tiền"));
    }

    @PostMapping("/payouts/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN','ORG_ADMIN')")
    @Operation(summary = "Reject a payout request")
    public ResponseEntity<ApiResponse<PayoutListDto>> reject(
            @PathVariable UUID id,
            @RequestBody AdminNoteBody body,
            @AuthenticationPrincipal UserJpaEntity admin) {
        var result = processPayoutUseCase.reject(id, admin.getId(), body.adminNote());
        return ResponseEntity.ok(ApiResponse.success(toDto(result), "Đã từ chối yêu cầu rút tiền"));
    }

    @PostMapping("/payouts/{id}/complete")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Mark payout as completed (after manual bank transfer)")
    public ResponseEntity<ApiResponse<PayoutListDto>> complete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserJpaEntity admin) {
        var result = processPayoutUseCase.complete(id, admin.getId());
        return ResponseEntity.ok(ApiResponse.success(toDto(result), "Đã xác nhận chuyển khoản thành công"));
    }

    // ── DTO ───────────────────────────────────────────────────────────────

    public record AdminNoteBody(String adminNote) {}

    public record PayoutListDto(
            UUID       id,
            UUID       teacherId,
            BigDecimal amount,
            String     status,
            String     teacherNote,
            String     adminNote,
            Instant    requestedAt,
            Instant    processedAt
    ) {}

    private PayoutListDto toDto(PayoutRequest p) {
        return new PayoutListDto(p.getId(), p.getTeacherId(), p.getAmount(),
                p.getStatus().name(), p.getTeacherNote(), p.getAdminNote(),
                p.getRequestedAt(), p.getProcessedAt());
    }
}
