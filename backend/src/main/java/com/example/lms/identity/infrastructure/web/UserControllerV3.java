package com.example.lms.identity.infrastructure.web;

import com.example.lms.identity.application.usecase.UpdateUserUseCaseV3;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * User Controller V3 - Admin User Management
 * 
 * Provides endpoints for admin to manage all users in the system.
 * Following SOTA patterns from major platforms (Dec 2025).
 */
@RestController
@RequestMapping("/api/v3/users")
@RequiredArgsConstructor
@Tag(name = "Admin - Users", description = "Admin user management endpoints")
public class UserControllerV3 {

    private final UserJpaRepository userRepository;
    private final UpdateUserUseCaseV3 updateUserUseCaseV3;

    @Operation(summary = "Get all users with pagination and filtering")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getUsers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status
    ) {
        PageRequest pageable = PageRequest.of(Math.max(0, page - 1), limit);
        
        Page<UserJpaEntity> users;
        if (search != null && !search.isBlank()) {
            // Search by email or fullName
            // Search by email or fullName
            users = userRepository.searchUsersByKeyword(search, pageable);
        } else {
            users = userRepository.findAll(pageable);
        }
        
        Page<UserResponse> response = users.map(this::toResponse);
        return ResponseEntity.ok(ApiResponse.success(response, "Users loaded"));
    }

    @Operation(summary = "Search users by role")
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> searchUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit
    ) {
        PageRequest pageable = PageRequest.of(Math.max(0, page - 1), limit);
        
        Page<UserJpaEntity> users;
        if (role != null && !role.isBlank() && q != null && !q.isBlank()) {
            UserJpaEntity.UserRole roleEnum = UserJpaEntity.UserRole.valueOf(role.toUpperCase());
            users = userRepository.searchUsersByRole(roleEnum, q, pageable);
        } else if (role != null && !role.isBlank()) {
            UserJpaEntity.UserRole roleEnum = UserJpaEntity.UserRole.valueOf(role.toUpperCase());
            users = userRepository.findByRole(roleEnum, pageable);
        } else if (q != null && !q.isBlank()) {
            users = userRepository.searchUsersByKeyword(q, pageable);
        } else {
            users = userRepository.findAll(pageable);
        }
        
        Page<UserResponse> response = users.map(this::toResponse);
        return ResponseEntity.ok(ApiResponse.success(response, "Users found"));
    }

    @Operation(summary = "Get all instructors")
    @GetMapping("/instructors")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getInstructors() {
        // Map "instructors" request to TEACHER role in the system
        List<UserJpaEntity> instructors = userRepository.findByRole(UserJpaEntity.UserRole.TEACHER);
        
        List<UserResponse> response = instructors.stream()
                .map(this::toResponse)
                .toList();
                
        return ResponseEntity.ok(ApiResponse.success(response, "Instructors loaded"));
    }

    @Operation(summary = "Get user by ID")
    @GetMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable UUID userId) {
        return userRepository.findById(userId)
                .map(user -> ResponseEntity.ok(ApiResponse.success(toResponse(user), "User loaded")))
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Update user")
    @PutMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateUserRequest request
    ) {
        var command = new UpdateUserUseCaseV3.Command(
                request.getFullName(),
                request.getRole(),
                request.getEnabled()
        );
        return updateUserUseCaseV3.execute(userId, command)
                .map(user -> ResponseEntity.ok(ApiResponse.success(toResponse(user), "User updated")))
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Delete user")
    @DeleteMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> deleteUser(@PathVariable UUID userId) {
        if (userRepository.existsById(userId)) {
            userRepository.deleteById(userId);
            return ResponseEntity.ok(ApiResponse.success("Deleted", "User deleted successfully"));
        }
        return ResponseEntity.notFound().build();
    }

    private UserResponse toResponse(UserJpaEntity user) {
        return UserResponse.builder()
                .id(user.getId().toString())
                .username(user.getUsername())
                .email(user.getEmail())
                .name(user.getFullName())
                .fullName(user.getFullName())
                .role(user.getRole() != null ? user.getRole().name().toLowerCase() : "student")
                .isActive(user.isEnabled())
                .enabled(user.isEnabled())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                .updatedAt(user.getUpdatedAt() != null ? user.getUpdatedAt().toString() : null)
                .build();
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId().value().toString())
                .username(user.getUsername())
                .email(user.getEmail().getValue())
                .name(user.getFullName())
                .fullName(user.getFullName())
                .role(user.getRole() != null ? user.getRole().name().toLowerCase() : "student")
                .isActive(user.isEnabled())
                .enabled(user.isEnabled())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                .updatedAt(user.getUpdatedAt() != null ? user.getUpdatedAt().toString() : null)
                .build();
    }

    // === DTOs ===

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UserResponse {
        private String id;
        private String username;
        private String email;
        private String name;
        private String fullName;
        private String role;
        private String avatar;
        private String department;
        private boolean isActive;
        private boolean enabled;
        private String createdAt;
        private String updatedAt;
        private String lastLogin;
        private int loginCount;
        private int coursesCreated;
        private int coursesEnrolled;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class UpdateUserRequest {
        @Size(max = 255, message = "Full name must not exceed 255 characters")
        private String fullName;
        private String role;
        private Boolean enabled;
    }
}
