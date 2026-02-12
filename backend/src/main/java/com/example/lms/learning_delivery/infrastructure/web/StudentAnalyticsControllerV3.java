package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.application.usecase.StudentAnalyticsUseCase;
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

import java.util.UUID;

@RestController
@RequestMapping("/api/v3/student")
@RequiredArgsConstructor
@Tag(name = "Student - Analytics", description = "Student learning analytics endpoints")
public class StudentAnalyticsControllerV3 {

    private final StudentAnalyticsUseCase analyticsUseCase;

    @Operation(summary = "Get student learning analytics")
    @GetMapping("/analytics")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<StudentAnalyticsUseCase.StudentAnalyticsResponse>> getAnalytics(
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        UUID studentId = currentUser.getId();
        var analytics = analyticsUseCase.getAnalytics(studentId);
        return ResponseEntity.ok(ApiResponse.success(analytics, "Analytics loaded"));
    }
}
