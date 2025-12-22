package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * V3 Controller for Course Packages (stub implementation).
 * TODO: Implement full package management features.
 */
@Tag(name = "Packages V3", description = "Course package management endpoints")
@RestController
@RequestMapping("/api/v3/packages")
@RequiredArgsConstructor
public class PackageControllerV3 {

    @Operation(summary = "Get teacher's packages")
    @GetMapping("/my-packages")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<PackageDTO>>> getMyPackages() {
        // TODO: Implement actual package retrieval
        // For now, return empty list to prevent 403 errors
        return ResponseEntity.ok(ApiResponse.success(List.of(), "Packages loaded"));
    }

    @Operation(summary = "Get all available packages")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<PackageDTO>>> getAllPackages() {
        // TODO: Implement actual package listing
        return ResponseEntity.ok(ApiResponse.success(List.of(), "All packages loaded"));
    }

    // DTO for package response
    @lombok.Builder
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class PackageDTO {
        private String id;
        private String name;
        private String description;
        private String status;
    }
}
