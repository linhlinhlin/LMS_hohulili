package com.example.lms.shared.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.application.usecase.ManageOrganizationCapabilitiesUseCase;
import com.example.lms.shared.application.usecase.ManageOrgPaymentConfigUseCase;
import com.example.lms.shared.domain.model.OrgPaymentConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/api/v3/organizations/{orgId}/payment-config")
@RequiredArgsConstructor
@Tag(name = "Org Payment Config", description = "Per-organization revenue split configuration")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('ADMIN','ORG_ADMIN')")
public class OrgPaymentConfigControllerV3 {
    private static final String ORG_PAYMENT_CONFIG = "org_payment_config";

    private final ManageOrgPaymentConfigUseCase useCase;
    private final ManageOrganizationCapabilitiesUseCase capabilitiesUseCase;

    @GetMapping
    @Operation(summary = "Get payment config for an organization (falls back to platform defaults)")
    public ResponseEntity<ApiResponse<OrgPaymentConfigDto>> getConfig(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, orgId);
        requirePaymentConfig(orgId);
        var config = useCase.getConfig(orgId);
        return ResponseEntity.ok(ApiResponse.success(toDto(config), "Cấu hình thanh toán"));
    }

    @PutMapping
    @Operation(summary = "Upsert payment config for an organization")
    public ResponseEntity<ApiResponse<OrgPaymentConfigDto>> upsertConfig(
            @PathVariable UUID orgId,
            @RequestBody UpsertConfigBody body,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, orgId);
        requirePaymentConfig(orgId);
        var config = useCase.upsertConfig(orgId,
                BigDecimal.valueOf(body.platformFeePct()),
                BigDecimal.valueOf(body.teacherSharePct()),
                BigDecimal.valueOf(body.minPayoutAmount()));
        return ResponseEntity.ok(ApiResponse.success(toDto(config), "Đã cập nhật cấu hình thanh toán"));
    }

    public record UpsertConfigBody(
            double platformFeePct,
            double teacherSharePct,
            double minPayoutAmount
    ) {}

    public record OrgPaymentConfigDto(
            UUID orgId,
            double platformFeePct,
            double teacherSharePct,
            double orgSharePct,
            double minPayoutAmount
    ) {}

    private OrgPaymentConfigDto toDto(OrgPaymentConfig config) {
        return new OrgPaymentConfigDto(
                config.getOrgId(),
                config.getPlatformFeePct().doubleValue(),
                config.getTeacherSharePct().doubleValue(),
                config.getOrgSharePct().doubleValue(),
                config.getMinPayoutAmount().doubleValue()
        );
    }

    private void verifyOrgAccess(UserJpaEntity currentUser, UUID orgId) {
        if (currentUser == null) {
            throw new AccessDeniedException("Không có quyền truy cập cấu hình thanh toán");
        }
        if (currentUser.getRole() != UserJpaEntity.UserRole.ORG_ADMIN) {
            return;
        }
        if (!Objects.equals(currentUser.getOrganizationId(), orgId)) {
            throw new AccessDeniedException("Không có quyền truy cập cấu hình thanh toán của tổ chức khác");
        }
    }

    private void requirePaymentConfig(UUID orgId) {
        if (!capabilitiesUseCase.isEnabled(orgId, ORG_PAYMENT_CONFIG)) {
            throw new AccessDeniedException("Organization capability is disabled: " + ORG_PAYMENT_CONFIG);
        }
    }
}
