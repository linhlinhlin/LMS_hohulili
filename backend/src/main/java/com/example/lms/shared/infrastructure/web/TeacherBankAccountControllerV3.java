package com.example.lms.shared.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.application.support.BankAccountMasking;
import com.example.lms.shared.application.usecase.ManageTeacherBankAccountUseCase;
import com.example.lms.shared.domain.model.TeacherBankAccount;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v3/teacher/bank-accounts")
@RequiredArgsConstructor
@Tag(name = "Teacher Bank Accounts", description = "Manage teacher bank accounts for payouts")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherBankAccountControllerV3 {

    private final ManageTeacherBankAccountUseCase useCase;

    @GetMapping
    @Operation(summary = "List all registered bank accounts")
    public ResponseEntity<ApiResponse<List<BankAccountDto>>> list(
            @AuthenticationPrincipal UserJpaEntity user) {
        var accounts = useCase.listAccounts(user.getId()).stream().map(this::toDto).toList();
        return ResponseEntity.ok(ApiResponse.success(accounts, "Danh sách tài khoản ngân hàng"));
    }

    @PostMapping
    @Operation(summary = "Add a new bank account")
    public ResponseEntity<ApiResponse<BankAccountDto>> add(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestBody AddBankAccountBody body) {
        var account = useCase.addAccount(user.getId(), body.bankCode(),
                body.accountNumber(), body.accountName());
        return ResponseEntity.ok(ApiResponse.success(toDto(account), "Đã thêm tài khoản ngân hàng"));
    }

    @PutMapping("/{id}/set-default")
    @Operation(summary = "Set a bank account as the default for payouts")
    public ResponseEntity<ApiResponse<BankAccountDto>> setDefault(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID id) {
        var account = useCase.setDefault(user.getId(), id);
        return ResponseEntity.ok(ApiResponse.success(toDto(account), "Đã đặt làm tài khoản mặc định"));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a bank account")
    public ResponseEntity<ApiResponse<Map<String, String>>> delete(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID id) {
        useCase.deleteAccount(user.getId(), id);
        return ResponseEntity.ok(ApiResponse.success(Map.of("id", id.toString()), "Đã xóa tài khoản ngân hàng"));
    }

    // ── DTOs ─────────────────────────────────────────────────────────────

    public record AddBankAccountBody(String bankCode, String accountNumber, String accountName) {}

    public record BankAccountDto(
            UUID    id,
            String  bankCode,
            String  accountNumberMasked,
            String  accountName,
            boolean isDefault,
            boolean verified
    ) {}

    private BankAccountDto toDto(TeacherBankAccount a) {
        String masked = BankAccountMasking.mask(a.getAccountNumber());
        return new BankAccountDto(a.getId(), a.getBankCode(), masked,
                a.getAccountName(), a.isDefault(), a.isVerified());
    }
}
