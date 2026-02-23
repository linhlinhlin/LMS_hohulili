package com.example.lms.shared.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.application.dto.SyncPushRequest;
import com.example.lms.shared.application.dto.SyncResponse;
import com.example.lms.shared.application.usecase.SyncUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

/**
 * Sync endpoints for PWA offline-first operations.
 * Handles bidirectional sync between offline IndexedDB and server.
 */
@RestController
@RequestMapping("/api/v3/sync")
@RequiredArgsConstructor
@Tag(name = "Sync V3", description = "Đồng bộ dữ liệu ngoại tuyến")
public class SyncControllerV3 {

    private final SyncUseCase syncUseCase;

    @PostMapping("/push")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Đẩy thay đổi ngoại tuyến lên server")
    public ResponseEntity<ApiResponse<SyncResponse.PushResult>> pushChanges(
            @AuthenticationPrincipal UserJpaEntity user,
            @Valid @RequestBody SyncPushRequest request) {

        SyncResponse.PushResult result = syncUseCase.pushChanges(
                user.getId().toString(), request);
        return ResponseEntity.ok(ApiResponse.success(result, "Đồng bộ thành công"));
    }

    @GetMapping("/pull")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lấy thay đổi từ server kể từ lần đồng bộ cuối")
    public ResponseEntity<ApiResponse<SyncResponse.PullResult>> pullChanges(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestParam(required = false) Instant since) {

        SyncResponse.PullResult result = syncUseCase.pullChanges(
                user.getId().toString(), since);
        return ResponseEntity.ok(ApiResponse.success(result, "Lấy dữ liệu đồng bộ thành công"));
    }

    @GetMapping("/status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Kiểm tra trạng thái đồng bộ")
    public ResponseEntity<ApiResponse<SyncResponse.Status>> getSyncStatus(
            @AuthenticationPrincipal UserJpaEntity user) {

        SyncResponse.Status status = syncUseCase.getStatus(user.getId().toString());
        return ResponseEntity.ok(ApiResponse.success(status, "Trạng thái đồng bộ"));
    }
}
