package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.application.usecase.GamificationUseCase;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v3/gamification")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
@Tag(name = "Gamification", description = "Streaks, achievements, daily goals")
public class GamificationControllerV3 {

    private final GamificationUseCase gamificationUseCase;

    @Operation(summary = "Get gamification profile (streak, achievements, daily goal)")
    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<GamificationUseCase.GamificationProfileResponse>> getProfile(
            @AuthenticationPrincipal UserJpaEntity user) {
        var profile = gamificationUseCase.getProfile(user.getId());
        return ResponseEntity.ok(ApiResponse.success(profile, "Hồ sơ thành tích"));
    }

    @Operation(summary = "Trigger streak update after learning activity")
    @PostMapping("/check-streak")
    public ResponseEntity<ApiResponse<GamificationUseCase.StreakResponse>> checkStreak(
            @AuthenticationPrincipal UserJpaEntity user) {
        var streak = gamificationUseCase.updateStreak(user.getId());
        return ResponseEntity.ok(ApiResponse.success(streak, "Đã cập nhật chuỗi ngày học"));
    }

    @Operation(summary = "Check and award new achievements")
    @PostMapping("/check-achievements")
    public ResponseEntity<ApiResponse<List<GamificationUseCase.AchievementResponse>>> checkAchievements(
            @AuthenticationPrincipal UserJpaEntity user) {
        var newAchievements = gamificationUseCase.checkAndAwardAchievements(user.getId());
        return ResponseEntity.ok(ApiResponse.success(newAchievements, "Đã kiểm tra thành tích"));
    }

    @Operation(summary = "Get paginated notifications")
    @GetMapping("/notifications")
    public ResponseEntity<ApiResponse<Page<GamificationUseCase.NotificationResponse>>> getNotifications(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        var notifications = gamificationUseCase.getNotifications(user.getId(), page, size);
        return ResponseEntity.ok(ApiResponse.success(notifications, "Danh sách thông báo"));
    }

    @Operation(summary = "Mark notification as read")
    @PatchMapping("/notifications/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markNotificationRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserJpaEntity user) {
        gamificationUseCase.markNotificationRead(id, user.getId());
        return ResponseEntity.ok(ApiResponse.success(null, "Đã đánh dấu đã đọc"));
    }

    @Operation(summary = "Get unread notification count")
    @GetMapping("/notifications/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(
            @AuthenticationPrincipal UserJpaEntity user) {
        long count = gamificationUseCase.getUnreadCount(user.getId());
        return ResponseEntity.ok(ApiResponse.success(Map.of("count", count), "Số thông báo chưa đọc"));
    }
}
