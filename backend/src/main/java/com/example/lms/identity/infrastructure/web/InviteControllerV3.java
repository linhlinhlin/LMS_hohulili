package com.example.lms.identity.infrastructure.web;

import com.example.lms.identity.application.dto.InviteResponse;
import com.example.lms.identity.application.usecase.AcceptInviteUseCase;
import com.example.lms.identity.application.usecase.ValidateInviteUseCase;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Public invite endpoints (validate) + Authenticated (accept).
 * Rate-limited: 20 req/min on validate endpoints.
 */
@RestController
@RequestMapping("/api/v3/invites")
@RequiredArgsConstructor
@Tag(name = "Invites", description = "API lời mời tổ chức")
public class InviteControllerV3 {

    private final ValidateInviteUseCase validateInviteUseCase;
    private final AcceptInviteUseCase acceptInviteUseCase;

    @GetMapping("/validate")
    @Operation(summary = "Validate invite code (public)")
    public ResponseEntity<ApiResponse<InviteResponse>> validateCode(
            @RequestParam @NotBlank String code) {
        InviteResponse response = validateInviteUseCase.validateByCode(code);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/validate-token")
    @Operation(summary = "Validate email invite token (public)")
    public ResponseEntity<ApiResponse<InviteResponse>> validateToken(
            @RequestParam @NotBlank String token) {
        InviteResponse response = validateInviteUseCase.validateByToken(token);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/accept")
    @Operation(summary = "Accept invite code (authenticated)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> acceptInvite(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @RequestBody AcceptInviteRequest request) {
        if (currentUser == null) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.error("Chưa đăng nhập"));
        }

        java.util.UUID orgId;
        if (request.token() != null && !request.token().isBlank()) {
            orgId = acceptInviteUseCase.acceptByToken(request.token(), currentUser.getId());
        } else if (request.code() != null && !request.code().isBlank()) {
            orgId = acceptInviteUseCase.acceptByCode(request.code(), currentUser.getId());
        } else {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Phải cung cấp mã mời hoặc token"));
        }

        return ResponseEntity.ok(ApiResponse.success(
                Map.of("organizationId", orgId, "message", "Đã tham gia tổ chức thành công"),
                "Tham gia tổ chức thành công"));
    }

    public record AcceptInviteRequest(String code, String token) {}
}
