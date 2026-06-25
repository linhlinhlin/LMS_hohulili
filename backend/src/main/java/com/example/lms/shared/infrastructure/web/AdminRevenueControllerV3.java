package com.example.lms.shared.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.application.support.BankAccountMasking;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v3/admin/revenue")
@RequiredArgsConstructor
@Tag(name = "Admin Revenue", description = "Platform revenue overview and payout management")
@SecurityRequirement(name = "bearerAuth")
public class AdminRevenueControllerV3 {

    private final ProcessPayoutUseCase processPayoutUseCase;
    private final PayoutRequestRepository payoutRepo;
    private final UserJpaRepository userRepo;
    private final TeacherBankAccountRepository bankAccountRepo;

    @GetMapping("/payouts")
    @PreAuthorize("hasAnyRole('ADMIN','ORG_ADMIN')")
    @Operation(summary = "List payout requests filtered by status")
    public ResponseEntity<ApiResponse<Page<PayoutListDto>>> listPayouts(
            @RequestParam(defaultValue = "PENDING") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        PageRequest pageable = PageRequest.of(page, size);
        Page<PayoutRequest> pageResult = resolveScopedPayoutPage(status, pageable, currentUser);

        List<UUID> teacherIds = pageResult.stream().map(PayoutRequest::getTeacherId).distinct().toList();
        Map<UUID, UserJpaEntity> users = userRepo.findAllById(teacherIds)
                .stream().collect(Collectors.toMap(UserJpaEntity::getId, u -> u));

        List<UUID> bankIds = pageResult.stream().map(PayoutRequest::getBankAccountId).distinct().toList();
        Map<UUID, TeacherBankAccount> banks = bankAccountRepo.findByIds(bankIds)
                .stream().collect(Collectors.toMap(TeacherBankAccount::getId, b -> b));

        var result = pageResult.map(p -> toDto(p, users.get(p.getTeacherId()), banks.get(p.getBankAccountId()), currentUser));
        return ResponseEntity.ok(ApiResponse.success(result, "Danh sách yêu cầu rút tiền"));
    }

    @PostMapping("/payouts/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','ORG_ADMIN')")
    @Operation(summary = "Approve a payout request")
    public ResponseEntity<ApiResponse<PayoutListDto>> approve(
            @PathVariable UUID id,
            @RequestBody(required = false) AdminNoteBody body,
            @AuthenticationPrincipal UserJpaEntity admin) {
        verifyPayoutAccess(id, admin);
        var result = processPayoutUseCase.approve(id, admin.getId(), body != null ? body.adminNote() : null);
        return ResponseEntity.ok(ApiResponse.success(enrich(result, admin), "Đã duyệt yêu cầu rút tiền"));
    }

    @PostMapping("/payouts/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN','ORG_ADMIN')")
    @Operation(summary = "Reject a payout request")
    public ResponseEntity<ApiResponse<PayoutListDto>> reject(
            @PathVariable UUID id,
            @RequestBody AdminNoteBody body,
            @AuthenticationPrincipal UserJpaEntity admin) {
        verifyPayoutAccess(id, admin);
        var result = processPayoutUseCase.reject(id, admin.getId(), body.adminNote());
        return ResponseEntity.ok(ApiResponse.success(enrich(result, admin), "Đã từ chối yêu cầu rút tiền"));
    }

    @PostMapping("/payouts/{id}/complete")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Mark payout as completed (after manual bank transfer)")
    public ResponseEntity<ApiResponse<PayoutListDto>> complete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserJpaEntity admin) {
        verifyPayoutAccess(id, admin);
        var result = processPayoutUseCase.complete(id, admin.getId());
        return ResponseEntity.ok(ApiResponse.success(enrich(result, admin), "Đã xác nhận chuyển khoản thành công"));
    }

    public record AdminNoteBody(String adminNote) {}

    public record PayoutListDto(
            UUID id,
            UUID teacherId,
            String teacherName,
            String teacherEmail,
            BigDecimal amount,
            String status,
            String teacherNote,
            String adminNote,
            Instant requestedAt,
            Instant processedAt,
            String bankCode,
            String accountNumber,
            String accountName
    ) {}

    private PayoutListDto enrich(PayoutRequest payout, UserJpaEntity viewer) {
        UserJpaEntity teacher = userRepo.findById(payout.getTeacherId()).orElse(null);
        TeacherBankAccount bank = bankAccountRepo.findById(payout.getBankAccountId()).orElse(null);
        return toDto(payout, teacher, bank, viewer);
    }

    private PayoutListDto toDto(
            PayoutRequest payout,
            UserJpaEntity teacher,
            TeacherBankAccount bank,
            UserJpaEntity viewer
    ) {
        return new PayoutListDto(
                payout.getId(),
                payout.getTeacherId(),
                teacher != null ? teacher.getFullName() : "—",
                teacher != null ? teacher.getEmail() : "—",
                payout.getAmount(),
                payout.getStatus().name(),
                payout.getTeacherNote(),
                payout.getAdminNote(),
                payout.getRequestedAt(),
                payout.getProcessedAt(),
                bank != null ? bank.getBankCode() : "—",
                bank != null ? BankAccountMasking.viewerAware(bank.getAccountNumber(), isSystemAdmin(viewer)) : "—",
                bank != null ? bank.getAccountName() : "—"
        );
    }

    private Page<PayoutRequest> resolveScopedPayoutPage(String status, PageRequest pageable, UserJpaEntity currentUser) {
        if (!isOrgAdmin(currentUser)) {
            return payoutRepo.findAllByStatus(status, pageable);
        }
        if (currentUser.getOrganizationId() == null) {
            return Page.empty(pageable);
        }
        return payoutRepo.findAllByStatusAndOrganizationId(status, currentUser.getOrganizationId(), pageable);
    }

    private void verifyPayoutAccess(UUID payoutId, UserJpaEntity admin) {
        if (!isOrgAdmin(admin)) {
            return;
        }

        PayoutRequest payout = payoutRepo.findById(payoutId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Yêu cầu rút tiền không tồn tại"));
        if (payout.getOrganizationId() != null) {
            if (!Objects.equals(payout.getOrganizationId(), admin.getOrganizationId())) {
                throw new AccessDeniedException("Không có quyền truy cập yêu cầu rút tiền của tổ chức khác");
            }
            return;
        }

        UserJpaEntity teacher = userRepo.findById(payout.getTeacherId()).orElse(null);
        if (teacher == null || !Objects.equals(teacher.getOrganizationId(), admin.getOrganizationId())) {
            throw new AccessDeniedException("Không có quyền truy cập yêu cầu rút tiền của tổ chức khác");
        }
    }

    private boolean isOrgAdmin(UserJpaEntity viewer) {
        return viewer != null && viewer.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
    }

    private boolean isSystemAdmin(UserJpaEntity viewer) {
        return viewer != null && viewer.getRole() == UserJpaEntity.UserRole.ADMIN;
    }
}
