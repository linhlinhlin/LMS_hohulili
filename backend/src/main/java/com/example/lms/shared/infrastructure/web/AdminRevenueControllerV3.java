package com.example.lms.shared.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.application.usecase.ProcessPayoutUseCase;
import com.example.lms.shared.domain.model.PayoutRequest;
import com.example.lms.shared.domain.model.TeacherBankAccount;
import com.example.lms.shared.domain.repository.PayoutRequestRepository;
import com.example.lms.shared.domain.repository.TeacherBankAccountRepository;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v3/admin/revenue")
@RequiredArgsConstructor
@Tag(name = "Admin Revenue", description = "Platform revenue overview and payout management")
@SecurityRequirement(name = "bearerAuth")
public class AdminRevenueControllerV3 {

    private final ProcessPayoutUseCase          processPayoutUseCase;
    private final PayoutRequestRepository       payoutRepo;
    private final UserJpaRepository             userRepo;
    private final TeacherBankAccountRepository  bankAccountRepo;

    // ── Payout management ─────────────────────────────────────────────────

    @GetMapping("/payouts")
    @PreAuthorize("hasAnyRole('ADMIN','ORG_ADMIN')")
    @Operation(summary = "List payout requests filtered by status")
    public ResponseEntity<ApiResponse<Page<PayoutListDto>>> listPayouts(
            @RequestParam(defaultValue = "PENDING") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<PayoutRequest> pageResult = payoutRepo.findAllByStatus(status, PageRequest.of(page, size));

        // Batch-load teacher names
        List<UUID> teacherIds = pageResult.stream().map(PayoutRequest::getTeacherId).distinct().toList();
        Map<UUID, UserJpaEntity> users = userRepo.findAllById(teacherIds)
                .stream().collect(Collectors.toMap(UserJpaEntity::getId, u -> u));

        // Batch-load bank accounts
        List<UUID> bankIds = pageResult.stream().map(PayoutRequest::getBankAccountId).distinct().toList();
        Map<UUID, TeacherBankAccount> banks = new HashMap<>();
        for (UUID id : bankIds) {
            bankAccountRepo.findById(id).ifPresent(b -> banks.put(id, b));
        }

        var result = pageResult.map(p -> toDto(p, users.get(p.getTeacherId()), banks.get(p.getBankAccountId())));
        return ResponseEntity.ok(ApiResponse.success(result, "Danh sách yêu cầu rút tiền"));
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
        return ResponseEntity.ok(ApiResponse.success(enrich(result), "Đã duyệt yêu cầu rút tiền"));
    }

    @PostMapping("/payouts/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN','ORG_ADMIN')")
    @Operation(summary = "Reject a payout request")
    public ResponseEntity<ApiResponse<PayoutListDto>> reject(
            @PathVariable UUID id,
            @RequestBody AdminNoteBody body,
            @AuthenticationPrincipal UserJpaEntity admin) {
        var result = processPayoutUseCase.reject(id, admin.getId(), body.adminNote());
        return ResponseEntity.ok(ApiResponse.success(enrich(result), "Đã từ chối yêu cầu rút tiền"));
    }

    @PostMapping("/payouts/{id}/complete")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Mark payout as completed (after manual bank transfer)")
    public ResponseEntity<ApiResponse<PayoutListDto>> complete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserJpaEntity admin) {
        var result = processPayoutUseCase.complete(id, admin.getId());
        return ResponseEntity.ok(ApiResponse.success(enrich(result), "Đã xác nhận chuyển khoản thành công"));
    }

    // ── DTO ───────────────────────────────────────────────────────────────

    public record AdminNoteBody(String adminNote) {}

    public record PayoutListDto(
            UUID       id,
            UUID       teacherId,
            String     teacherName,
            String     teacherEmail,
            BigDecimal amount,
            String     status,
            String     teacherNote,
            String     adminNote,
            Instant    requestedAt,
            Instant    processedAt,
            // Bank transfer info (full account number for admin — never masked)
            String     bankCode,
            String     accountNumber,
            String     accountName
    ) {}

    /** Enrich a single payout with teacher + bank info (used by action endpoints). */
    private PayoutListDto enrich(PayoutRequest p) {
        UserJpaEntity user = userRepo.findById(p.getTeacherId()).orElse(null);
        TeacherBankAccount bank = bankAccountRepo.findById(p.getBankAccountId()).orElse(null);
        return toDto(p, user, bank);
    }

    private PayoutListDto toDto(PayoutRequest p, UserJpaEntity user, TeacherBankAccount bank) {
        return new PayoutListDto(
                p.getId(),
                p.getTeacherId(),
                user != null ? user.getFullName() : "—",
                user != null ? user.getEmail()    : "—",
                p.getAmount(),
                p.getStatus().name(),
                p.getTeacherNote(),
                p.getAdminNote(),
                p.getRequestedAt(),
                p.getProcessedAt(),
                bank != null ? bank.getBankCode()      : "—",
                bank != null ? bank.getAccountNumber() : "—",   // Full number for admin
                bank != null ? bank.getAccountName()   : "—"
        );
    }
}
