package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.application.usecase.TeacherAnalyticsUseCase;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v3/teacher")
@RequiredArgsConstructor
@Tag(name = "Teacher - Analytics", description = "Teacher analytics endpoints")
public class TeacherAnalyticsControllerV3 {

    private final TeacherAnalyticsUseCase analyticsUseCase;

    @Operation(summary = "Get teacher analytics")
    @GetMapping("/analytics")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<ApiResponse<TeacherAnalyticsUseCase.TeacherAnalyticsResponse>> getAnalytics(
            @AuthenticationPrincipal UserJpaEntity user) {
        var analytics = analyticsUseCase.getAnalytics(user.getId());
        return ResponseEntity.ok(ApiResponse.success(analytics, "Dữ liệu phân tích"));
    }
}
