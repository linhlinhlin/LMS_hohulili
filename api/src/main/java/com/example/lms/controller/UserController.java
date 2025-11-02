package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.User;
import com.example.lms.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "API quản lý người dùng (Admin only)")
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "Bearer Authentication")
public class UserController {

    private final UserService userService;

    @GetMapping
    @Operation(summary = "Lấy danh sách người dùng", description = "Admin lấy danh sách tất cả người dùng với phân trang")
    public ResponseEntity<ApiResponse<Page<UserSummary>>> getAllUsers(
            @Parameter(description = "Số trang (bắt đầu từ 1)") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "Số lượng item trên mỗi trang") @RequestParam(defaultValue = "10") int limit,
            @Parameter(description = "Tìm kiếm theo tên hoặc email") @RequestParam(required = false) String search
    ) {
        try {
            Pageable pageable = PageRequest.of(page - 1, limit);
            Page<User> users = userService.getAllUsers(pageable, search);
            
            Page<UserSummary> userSummaries = users.map(user -> UserSummary.builder()
                    .id(user.getId())
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .role(user.getRole().name())
                    .enabled(user.getEnabled())
                    .createdAt(user.getCreatedAt())
                    .build());
            
            return ResponseEntity.ok(ApiResponse.success(userSummaries));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi lấy danh sách người dùng: " + e.getMessage()));
        }
    }

    @PostMapping
    @Operation(summary = "Tạo người dùng mới", description = "Admin tạo tài khoản người dùng mới")
    public ResponseEntity<ApiResponse<UserDetail>> createUser(@Valid @RequestBody CreateUserRequest request) {
        try {
            User newUser = userService.createUser(request);
            
            UserDetail userDetail = UserDetail.builder()
                    .id(newUser.getId())
                    .username(newUser.getUsername())
                    .email(newUser.getEmail())
                    .fullName(newUser.getFullName())
                    .role(newUser.getRole().name())
                    .enabled(newUser.getEnabled())
                    .createdAt(newUser.getCreatedAt())
                    .updatedAt(newUser.getUpdatedAt())
                    .build();
            
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(userDetail));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{userId}")
    @Operation(summary = "Lấy thông tin chi tiết người dùng", description = "Admin lấy thông tin của một người dùng cụ thể")
    public ResponseEntity<ApiResponse<UserDetail>> getUserById(@PathVariable UUID userId) {
        try {
            User user = userService.getUserById(userId);
            
            UserDetail userDetail = UserDetail.builder()
                    .id(user.getId())
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .role(user.getRole().name())
                    .enabled(user.getEnabled())
                    .createdAt(user.getCreatedAt())
                    .updatedAt(user.getUpdatedAt())
                    .build();
            
            return ResponseEntity.ok(ApiResponse.success(userDetail));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Không tìm thấy người dùng"));
        }
    }

    @PutMapping("/{userId}")
    @Operation(summary = "Cập nhật thông tin người dùng", description = "Admin cập nhật thông tin của một người dùng")
    public ResponseEntity<ApiResponse<UserDetail>> updateUser(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateUserRequest request
    ) {
        try {
            User updatedUser = userService.updateUser(userId, request);
            
            UserDetail userDetail = UserDetail.builder()
                    .id(updatedUser.getId())
                    .username(updatedUser.getUsername())
                    .email(updatedUser.getEmail())
                    .fullName(updatedUser.getFullName())
                    .role(updatedUser.getRole().name())
                    .enabled(updatedUser.getEnabled())
                    .createdAt(updatedUser.getCreatedAt())
                    .updatedAt(updatedUser.getUpdatedAt())
                    .build();
            
            return ResponseEntity.ok(ApiResponse.success(userDetail));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{userId}")
    @Operation(summary = "Vô hiệu hóa người dùng", description = "Admin vô hiệu hóa tài khoản người dùng")
    public ResponseEntity<ApiResponse<String>> deleteUser(@PathVariable UUID userId) {
        try {
            userService.disableUser(userId);
            return ResponseEntity.ok(ApiResponse.success("Người dùng đã được vô hiệu hóa"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // DTOs
    public static class UserSummary {
        private UUID id;
        private String username;
        private String email;
        private String fullName;
        private String role;
        private Boolean enabled;
        private java.time.Instant createdAt;

        public static UserSummaryBuilder builder() {
            return new UserSummaryBuilder();
        }

        public static class UserSummaryBuilder {
            private UUID id;
            private String username;
            private String email;
            private String fullName;
            private String role;
            private Boolean enabled;
            private java.time.Instant createdAt;

            public UserSummaryBuilder id(UUID id) { this.id = id; return this; }
            public UserSummaryBuilder username(String username) { this.username = username; return this; }
            public UserSummaryBuilder email(String email) { this.email = email; return this; }
            public UserSummaryBuilder fullName(String fullName) { this.fullName = fullName; return this; }
            public UserSummaryBuilder role(String role) { this.role = role; return this; }
            public UserSummaryBuilder enabled(Boolean enabled) { this.enabled = enabled; return this; }
            public UserSummaryBuilder createdAt(java.time.Instant createdAt) { this.createdAt = createdAt; return this; }

            public UserSummary build() {
                UserSummary user = new UserSummary();
                user.id = this.id;
                user.username = this.username;
                user.email = this.email;
                user.fullName = this.fullName;
                user.role = this.role;
                user.enabled = this.enabled;
                user.createdAt = this.createdAt;
                return user;
            }
        }

        // Getters
        public UUID getId() { return id; }
        public String getUsername() { return username; }
        public String getEmail() { return email; }
        public String getFullName() { return fullName; }
        public String getRole() { return role; }
        public Boolean getEnabled() { return enabled; }
        public java.time.Instant getCreatedAt() { return createdAt; }
    }

    public static class UserDetail {
        private UUID id;
        private String username;
        private String email;
        private String fullName;
        private String role;
        private Boolean enabled;
        private java.time.Instant createdAt;
        private java.time.Instant updatedAt;

        public static UserDetailBuilder builder() {
            return new UserDetailBuilder();
        }

        public static class UserDetailBuilder {
            private UUID id;
            private String username;
            private String email;
            private String fullName;
            private String role;
            private Boolean enabled;
            private java.time.Instant createdAt;
            private java.time.Instant updatedAt;

            public UserDetailBuilder id(UUID id) { this.id = id; return this; }
            public UserDetailBuilder username(String username) { this.username = username; return this; }
            public UserDetailBuilder email(String email) { this.email = email; return this; }
            public UserDetailBuilder fullName(String fullName) { this.fullName = fullName; return this; }
            public UserDetailBuilder role(String role) { this.role = role; return this; }
            public UserDetailBuilder enabled(Boolean enabled) { this.enabled = enabled; return this; }
            public UserDetailBuilder createdAt(java.time.Instant createdAt) { this.createdAt = createdAt; return this; }
            public UserDetailBuilder updatedAt(java.time.Instant updatedAt) { this.updatedAt = updatedAt; return this; }

            public UserDetail build() {
                UserDetail user = new UserDetail();
                user.id = this.id;
                user.username = this.username;
                user.email = this.email;
                user.fullName = this.fullName;
                user.role = this.role;
                user.enabled = this.enabled;
                user.createdAt = this.createdAt;
                user.updatedAt = this.updatedAt;
                return user;
            }
        }

        // Getters
        public UUID getId() { return id; }
        public String getUsername() { return username; }
        public String getEmail() { return email; }
        public String getFullName() { return fullName; }
        public String getRole() { return role; }
        public Boolean getEnabled() { return enabled; }
        public java.time.Instant getCreatedAt() { return createdAt; }
        public java.time.Instant getUpdatedAt() { return updatedAt; }
    }

    public static class CreateUserRequest {
        @NotBlank(message = "Tên đăng nhập không được để trống")
        @Size(min = 3, max = 50, message = "Tên đăng nhập phải từ 3-50 ký tự")
        private String username;

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        private String email;

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự")
        private String password;

        @Size(max = 100, message = "Họ tên không được vượt quá 100 ký tự")
        private String fullName;

        @NotBlank(message = "Vai trò không được để trống")
        private String role;

        // Getters and Setters
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
    }

    public static class UpdateUserRequest {
        @Email(message = "Email không đúng định dạng")
        private String email;

        @Size(max = 100, message = "Họ tên không được vượt quá 100 ký tự")
        private String fullName;

        private String role;

        private Boolean enabled;

        // Getters and Setters
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
        public Boolean getEnabled() { return enabled; }
        public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    }
}