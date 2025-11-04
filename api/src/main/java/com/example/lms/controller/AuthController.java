package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.User;
import com.example.lms.service.AuthenticationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "API xác thực người dùng")
public class AuthController {

    private final AuthenticationService authenticationService;

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản mới", description = "Tạo tài khoản người dùng mới")
    public ResponseEntity<?> register(
            @Valid @RequestBody AuthenticationService.RegisterRequest request
    ) {
        try {
            AuthenticationService.AuthenticationResponse response = authenticationService.register(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            // Return error message in body for frontend consumption
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập", description = "Xác thực và đăng nhập người dùng")
    public ResponseEntity<?> authenticate(
            @Valid @RequestBody AuthenticationService.AuthenticationRequest request
    ) {
        System.out.println("=== LOGIN CONTROLLER DEBUG ===");
        System.out.println("Login request received: " + request.getEmail());
        System.out.println("Password length: " + (request.getPassword() != null ? request.getPassword().length() : 0));
        try {
            AuthenticationService.AuthenticationResponse response = authenticationService.authenticate(request);
            System.out.println("Login successful for user: " + response.getUser().getUsername());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            System.out.println("Login failed with error: " + e.getMessage());
            // Return proper JSON response for frontend
            return ResponseEntity.status(401).body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/refresh")
    @Operation(summary = "Làm mới token", description = "Tạo access token mới từ refresh token")
    public ResponseEntity<AuthenticationService.AuthenticationResponse> refreshToken(
            @RequestBody RefreshTokenRequest request
    ) {
        try {
            AuthenticationService.AuthenticationResponse response = authenticationService.refreshToken(request.getRefreshToken());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).build();
        }
    }

    @PostMapping("/logout")
    @Operation(summary = "Đăng xuất", description = "Đăng xuất người dùng")
    public ResponseEntity<String> logout() {
        // In a real application, you might want to invalidate the token on the server side
        // For JWT, typically the client just discards the token
        return ResponseEntity.ok("Đăng xuất thành công");
    }

    @GetMapping("/me")
    @Operation(summary = "Lấy thông tin người dùng hiện tại", 
               security = @SecurityRequirement(name = "Bearer Authentication"))
    public ResponseEntity<ApiResponse<UserProfile>> getCurrentUser(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Unauthorized - User not authenticated"));
        }
        
        UserProfile profile = UserProfile.builder()
                .id(currentUser.getId())
                .username(currentUser.getUsername())
                .email(currentUser.getEmail())
                .fullName(currentUser.getFullName())
                .role(currentUser.getRole().name())
                .enabled(currentUser.getEnabled())
                .build();
                
        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    @PutMapping("/profile")
    @Operation(summary = "Cập nhật thông tin cá nhân", 
               security = @SecurityRequirement(name = "Bearer Authentication"))
    public ResponseEntity<ApiResponse<UserProfile>> updateProfile(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Unauthorized - User not authenticated"));
        }
        
        try {
            User updatedUser = authenticationService.updateProfile(currentUser, request);
            
            UserProfile profile = UserProfile.builder()
                    .id(updatedUser.getId())
                    .username(updatedUser.getUsername())
                    .email(updatedUser.getEmail())
                    .fullName(updatedUser.getFullName())
                    .role(updatedUser.getRole().name())
                    .enabled(updatedUser.getEnabled())
                    .build();
                    
            return ResponseEntity.ok(ApiResponse.success(profile));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/password")
    @Operation(summary = "Thay đổi mật khẩu", 
               security = @SecurityRequirement(name = "Bearer Authentication"))
    public ResponseEntity<ApiResponse<String>> changePassword(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Unauthorized - User not authenticated"));
        }
        
        try {
            authenticationService.changePassword(currentUser, request);
            return ResponseEntity.ok(ApiResponse.success("Mật khẩu đã được thay đổi thành công"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // DTOs
    public static class UserProfile {
        private java.util.UUID id;
        private String username;
        private String email;
        private String fullName;
        private String role;
        private Boolean enabled;
        
        public static UserProfileBuilder builder() {
            return new UserProfileBuilder();
        }
        
        public static class UserProfileBuilder {
            private java.util.UUID id;
            private String username;
            private String email;
            private String fullName;
            private String role;
            private Boolean enabled;
            
            public UserProfileBuilder id(java.util.UUID id) { this.id = id; return this; }
            public UserProfileBuilder username(String username) { this.username = username; return this; }
            public UserProfileBuilder email(String email) { this.email = email; return this; }
            public UserProfileBuilder fullName(String fullName) { this.fullName = fullName; return this; }
            public UserProfileBuilder role(String role) { this.role = role; return this; }
            public UserProfileBuilder enabled(Boolean enabled) { this.enabled = enabled; return this; }
            
            public UserProfile build() {
                UserProfile profile = new UserProfile();
                profile.id = this.id;
                profile.username = this.username;
                profile.email = this.email;
                profile.fullName = this.fullName;
                profile.role = this.role;
                profile.enabled = this.enabled;
                return profile;
            }
        }
        
        // Getters
        public java.util.UUID getId() { return id; }
        public String getUsername() { return username; }
        public String getEmail() { return email; }
        public String getFullName() { return fullName; }
        public String getRole() { return role; }
        public Boolean getEnabled() { return enabled; }
    }
    
    public static class RefreshTokenRequest {
        private String refreshToken;

        public RefreshTokenRequest() {}
        public RefreshTokenRequest(String refreshToken) {
            this.refreshToken = refreshToken;
        }

        public String getRefreshToken() { return refreshToken; }
        public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
    }

    public static class UpdateProfileRequest {
        @jakarta.validation.constraints.Size(max = 100, message = "Họ tên không được vượt quá 100 ký tự")
        private String fullName;
        
        @jakarta.validation.constraints.Email(message = "Email không đúng định dạng")
        private String email;

        public UpdateProfileRequest() {}
        
        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }

    public static class ChangePasswordRequest {
        @jakarta.validation.constraints.NotBlank(message = "Mật khẩu hiện tại không được để trống")
        private String currentPassword;
        
        @jakarta.validation.constraints.NotBlank(message = "Mật khẩu mới không được để trống")
        @jakarta.validation.constraints.Size(min = 6, message = "Mật khẩu mới phải có ít nhất 6 ký tự")
        private String newPassword;

        public ChangePasswordRequest() {}
        
        public String getCurrentPassword() { return currentPassword; }
        public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }
        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
    }
}