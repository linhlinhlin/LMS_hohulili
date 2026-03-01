package com.example.lms.identity.infrastructure.web;

import com.example.lms.identity.application.dto.*;
import com.example.lms.identity.application.usecase.*;
import com.example.lms.identity.domain.model.Organization;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Organization management endpoints.
 * ADMIN: full access. ORG_ADMIN: own org only.
 */
@Slf4j
@RestController
@RequestMapping("/api/v3/organizations")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Organizations", description = "API quản lý tổ chức")
public class OrganizationControllerV3 {

    private final CreateOrganizationUseCase createOrganizationUseCase;
    private final ListOrganizationsUseCase listOrganizationsUseCase;
    private final OrganizationRepository orgRepo;
    private final CreateInviteCodeUseCase createInviteCodeUseCase;
    private final SendEmailInviteUseCase sendEmailInviteUseCase;
    private final ListInvitesUseCase listInvitesUseCase;
    private final RevokeInviteUseCase revokeInviteUseCase;
    private final UserJpaRepository userJpaRepo;

    // ==================== Organization CRUD ====================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Danh sách tổ chức")
    public ResponseEntity<ApiResponse<List<OrganizationResponse>>> listOrganizations(
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        if (isOrgAdmin(currentUser)) {
            // ORG_ADMIN: only sees own org
            if (currentUser.getOrganizationId() == null) {
                return ResponseEntity.ok(ApiResponse.success(List.of()));
            }
            return orgRepo.findById(currentUser.getOrganizationId())
                    .map(org -> ResponseEntity.ok(ApiResponse.success(
                            List.of(OrganizationResponse.from(org)))))
                    .orElse(ResponseEntity.ok(ApiResponse.success(List.of())));
        }
        return ResponseEntity.ok(ApiResponse.success(listOrganizationsUseCase.execute()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Chi tiết tổ chức")
    public ResponseEntity<ApiResponse<OrganizationResponse>> getOrganization(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, id);
        Organization org = orgRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Tổ chức", id));
        return ResponseEntity.ok(ApiResponse.success(OrganizationResponse.from(org)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Tạo tổ chức mới (ADMIN only)")
    public ResponseEntity<ApiResponse<OrganizationResponse>> createOrganization(
            @Valid @RequestBody CreateOrgRequest request) {
        OrganizationResponse response = createOrganizationUseCase.execute(
                request.name(), request.code(), request.description(), request.tokenExpiryDays());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Tạo tổ chức thành công"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Cập nhật tổ chức")
    public ResponseEntity<ApiResponse<OrganizationResponse>> updateOrganization(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateOrgRequest request,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, id);
        Organization org = orgRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Tổ chức", id));
        org.update(request.name(), request.description(), request.tokenExpiryDays());
        Organization saved = orgRepo.save(org);
        return ResponseEntity.ok(ApiResponse.success(OrganizationResponse.from(saved), "Cập nhật thành công"));
    }

    // ==================== Members ====================

    @GetMapping("/{id}/members")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Danh sách thành viên")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listMembers(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, id);
        var members = userJpaRepo.findByOrganizationId(id).stream()
                .map(u -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", u.getId());
                    m.put("email", u.getEmail());
                    m.put("fullName", u.getFullName());
                    m.put("role", u.getRole().name());
                    m.put("enabled", u.getEnabled() != null && u.getEnabled());
                    m.put("tokenExpiryDays", u.getTokenExpiryDays());
                    return m;
                })
                .toList();
        return ResponseEntity.ok(ApiResponse.success(members));
    }

    @PostMapping("/{id}/members")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Thêm thành viên vào tổ chức")
    public ResponseEntity<ApiResponse<String>> addMember(
            @PathVariable UUID id,
            @Valid @RequestBody AddMemberRequest request,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, id);

        // Audit fix: Validate UUID format
        UUID userId;
        try {
            userId = UUID.fromString(request.userId());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("ID người dùng không hợp lệ"));
        }

        UserJpaEntity user = userJpaRepo.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Người dùng", userId));

        // P0: Check if user is already in a different org
        if (user.getOrganizationId() != null && !id.equals(user.getOrganizationId())) {
            return ResponseEntity.badRequest().body(ApiResponse.error(
                "Người dùng đã thuộc tổ chức khác. Vui lòng xóa khỏi tổ chức hiện tại trước."));
        }

        user.setOrganizationId(id);
        userJpaRepo.save(user);
        log.info("Member added: userId={} to orgId={} by={}", userId, id, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("Đã thêm thành viên"));
    }

    @DeleteMapping("/{id}/members/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Xóa thành viên khỏi tổ chức")
    public ResponseEntity<ApiResponse<String>> removeMember(
            @PathVariable UUID id,
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, id);

        // P0: Prevent self-removal
        if (currentUser.getId().equals(userId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error(
                "Không thể tự xóa chính mình khỏi tổ chức"));
        }

        UserJpaEntity user = userJpaRepo.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Người dùng", userId));
        if (!id.equals(user.getOrganizationId())) {
            throw new EntityNotFoundException("Thành viên", userId);
        }

        // P0: ORG_ADMIN cannot remove ADMIN or other ORG_ADMIN
        if (isOrgAdmin(currentUser) && (user.getRole() == UserJpaEntity.UserRole.ADMIN || user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN)) {
            return ResponseEntity.status(403).body(ApiResponse.error(
                "Không có quyền xóa quản trị viên khỏi tổ chức"));
        }

        user.setOrganizationId(null);
        userJpaRepo.save(user);
        log.info("Member removed: userId={} from orgId={} by={}", userId, id, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("Đã xóa thành viên"));
    }

    @PutMapping("/{id}/members/{userId}/token-config")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Cấu hình token cho thành viên")
    public ResponseEntity<ApiResponse<Map<String, Object>>> setMemberTokenExpiry(
            @PathVariable UUID id,
            @PathVariable UUID userId,
            @Valid @RequestBody SetMemberTokenExpiryRequest request,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, id);

        Organization org = orgRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Tổ chức", id));
        org.validateMemberTokenExpiry(request.tokenExpiryDays());

        UserJpaEntity user = userJpaRepo.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Người dùng", userId));
        if (!id.equals(user.getOrganizationId())) {
            throw new EntityNotFoundException("Thành viên", userId);
        }

        // P1: ORG_ADMIN cannot modify token for ADMIN or other ORG_ADMIN
        if (isOrgAdmin(currentUser) && (user.getRole() == UserJpaEntity.UserRole.ADMIN || user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN)) {
            return ResponseEntity.status(403).body(ApiResponse.error(
                "Không có quyền thay đổi cấu hình token của quản trị viên"));
        }

        user.setTokenExpiryDays(request.tokenExpiryDays());
        userJpaRepo.save(user);

        Map<String, Object> result = new HashMap<>();
        result.put("userId", userId);
        result.put("tokenExpiryDays", request.tokenExpiryDays());
        result.put("effectiveExpiryDays", request.tokenExpiryDays() != null ? request.tokenExpiryDays() : org.getTokenExpiryDays());
        log.info("Token config updated: userId={} orgId={} days={} by={}", userId, id, request.tokenExpiryDays(), currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(result, "Đã cập nhật cấu hình token"));
    }

    // ==================== Invite Management ====================

    @PostMapping("/{id}/invites/code")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Tạo mã mời")
    public ResponseEntity<ApiResponse<InviteResponse>> createInviteCode(
            @PathVariable UUID id,
            @Valid @RequestBody CreateInviteCodeCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, id);
        InviteResponse response = createInviteCodeUseCase.execute(id, command, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Tạo mã mời thành công"));
    }

    @PostMapping("/{id}/invites/email")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Gửi lời mời email")
    public ResponseEntity<ApiResponse<InviteResponse>> sendEmailInvite(
            @PathVariable UUID id,
            @Valid @RequestBody SendEmailInviteCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, id);
        InviteResponse response = sendEmailInviteUseCase.execute(id, command, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Đã gửi lời mời"));
    }

    @GetMapping("/{id}/invites")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Danh sách lời mời")
    public ResponseEntity<ApiResponse<List<InviteResponse>>> listInvites(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success(listInvitesUseCase.execute(id)));
    }

    @DeleteMapping("/{id}/invites/{inviteId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Thu hồi lời mời")
    public ResponseEntity<ApiResponse<String>> revokeInvite(
            @PathVariable UUID id,
            @PathVariable UUID inviteId,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, id);
        revokeInviteUseCase.execute(inviteId, id);
        return ResponseEntity.ok(ApiResponse.success("Đã thu hồi lời mời"));
    }

    // ==================== Helpers ====================

    private void verifyOrgAccess(UserJpaEntity currentUser, UUID orgId) {
        if (currentUser == null) {
            throw new org.springframework.security.access.AccessDeniedException("Chưa đăng nhập");
        }
        if (isAdmin(currentUser)) return; // ADMIN has full access
        if (isOrgAdmin(currentUser)) {
            if (!orgId.equals(currentUser.getOrganizationId())) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "Bạn không có quyền quản lý tổ chức này");
            }
            return;
        }
        throw new org.springframework.security.access.AccessDeniedException("Không đủ quyền");
    }

    private boolean isAdmin(UserJpaEntity user) {
        return user.getRole() == UserJpaEntity.UserRole.ADMIN;
    }

    private boolean isOrgAdmin(UserJpaEntity user) {
        return user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
    }

    // ==================== Request DTOs ====================

    public record CreateOrgRequest(
        @NotBlank String name,
        @NotBlank @Size(min = 2, max = 50) String code,
        String description,
        @Min(7) @Max(1095) int tokenExpiryDays
    ) {
        public CreateOrgRequest {
            if (tokenExpiryDays == 0) tokenExpiryDays = 30;
        }
    }

    public record UpdateOrgRequest(
        @NotBlank String name,
        String description,
        @Min(7) @Max(1095) int tokenExpiryDays
    ) {}

    public record AddMemberRequest(
        @NotBlank String userId
    ) {}

    public record SetMemberTokenExpiryRequest(
        @Min(1) @Max(1095) Integer tokenExpiryDays
    ) {}
}
