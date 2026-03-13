package com.example.lms.shared.infrastructure.web;

import com.example.lms.shared.application.usecase.ManageOrgPaymentConfigUseCase;
import com.example.lms.shared.domain.model.OrgPaymentConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v3/organizations/{orgId}/payment-config")
@RequiredArgsConstructor
@Tag(name = "Org Payment Config", description = "Per-organization revenue split configuration")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('ADMIN','ORG_ADMIN')")
public class OrgPaymentConfigControllerV3 {

    private final ManageOrgPaymentConfigUseCase useCase;

    @GetMapping
    @Operation(summary = "Get payment config for an organization (falls back to platform defaults)")
    public ResponseEntity<ApiResponse<OrgPaymentConfigDto>> getConfig(
            @PathVariable UUID orgId) {
        var config = useCase.getConfig(orgId);
        return ResponseEntity.ok(ApiResponse.success(toDto(config), "Cấu hình thanh toán"));
    }

    @PutMapping
    @Operation(summary = "Upsert payment config for an organization")
    public ResponseEntity<ApiResponse<OrgPaymentConfigDto>> upsertConfig(
            @PathVariable UUID orgId,
            @RequestBody UpsertConfigBody body) {
        var config = useCase.upsertConfig(orgId,
                BigDecimal.valueOf(body.platformFeePct()),
                BigDecimal.valueOf(body.teacherSharePct()),
                BigDecimal.valueOf(body.minPayoutAmount()));
        return ResponseEntity.ok(ApiResponse.success(toDto(config), "Đã cập nhật cấu hình thanh toán"));
    }

    // ── DTOs ─────────────────────────────────────────────────────────────

    public record UpsertConfigBody(
            double platformFeePct,
            double teacherSharePct,
            double minPayoutAmount
    ) {}

    public record OrgPaymentConfigDto(
            UUID   orgId,
            double platformFeePct,
            double teacherSharePct,
            double orgSharePct,
            double minPayoutAmount
    ) {}

    private OrgPaymentConfigDto toDto(OrgPaymentConfig c) {
        return new OrgPaymentConfigDto(
                c.getOrgId(),
                c.getPlatformFeePct().doubleValue(),
                c.getTeacherSharePct().doubleValue(),
                c.getOrgSharePct().doubleValue(),
                c.getMinPayoutAmount().doubleValue()
        );
    }
}
