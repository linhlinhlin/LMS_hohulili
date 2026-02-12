package com.example.lms.shared.infrastructure.web;

import com.example.lms.shared.application.usecase.AdminSettingsUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v3/admin/settings")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin Settings", description = "System settings management")
public class AdminSettingsControllerV3 {

    private final AdminSettingsUseCase settingsUseCase;

    @GetMapping
    @Operation(summary = "Get system settings")
    public ResponseEntity<ApiResponse<AdminSettingsUseCase.SettingsResponse>> getSettings() {
        var settings = settingsUseCase.getSettings();
        return ResponseEntity.ok(ApiResponse.success(settings, "Cài đặt hệ thống"));
    }

    @PutMapping
    @Operation(summary = "Update system settings")
    public ResponseEntity<ApiResponse<AdminSettingsUseCase.SettingsResponse>> updateSettings(
            @RequestBody AdminSettingsUseCase.SettingsResponse settings) {
        var updated = settingsUseCase.updateSettings(settings);
        return ResponseEntity.ok(ApiResponse.success(updated, "Cập nhật cài đặt thành công"));
    }
}
