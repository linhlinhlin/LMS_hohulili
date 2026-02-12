package com.example.lms.identity.infrastructure.web;

import com.example.lms.identity.application.dto.*;
import com.example.lms.identity.application.usecase.*;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST Controller for Authentication operations.
 * 
 * V3 - Pure DDD version using domain models only.
 * - Uses V2 use cases (pure domain models, no legacy entity imports)
 * - Follows Clean Architecture / Hexagonal Architecture
 * - No dependency on legacy entity package
 */
@Slf4j
@RestController
@RequestMapping("/api/v3/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication v3", description = "API xác thực người dùng (Pure DDD)")
public class AuthControllerV3 {

    private final UserJpaRepository userJpaRepository;

    @Qualifier("registerUserUseCaseV2")
    private final RegisterUserUseCaseV2 registerUseCase;
    
    @Qualifier("authenticateUserUseCaseV2")
    private final AuthenticateUserUseCaseV2 authenticateUseCase;
    
    @Qualifier("getCurrentUserUseCaseV2")
    private final GetCurrentUserUseCaseV2 getCurrentUserUseCase;
    
    @Qualifier("updateProfileUseCaseV2")
    private final UpdateProfileUseCaseV2 updateProfileUseCase;
    
    @Qualifier("changePasswordUseCaseV2")
    private final ChangePasswordUseCaseV2 changePasswordUseCase;

    @Qualifier("refreshTokenUseCaseV2")
    private final RefreshTokenUseCaseV2 refreshTokenUseCase;

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản mới (DDD)")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        RegisterUserCommand command = new RegisterUserCommand(
            request.username(),
            request.email(),
            request.password(),
            request.fullName(),
            request.role()
        );

        AuthResponse response = registerUseCase.execute(command);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(response, "Đăng ký thành công"));
    }

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập (DDD)")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request
    ) {
        AuthenticateCommand command = new AuthenticateCommand(
            request.email(),
            request.password()
        );

        AuthResponse response = authenticateUseCase.execute(command);
        return ResponseEntity.ok(ApiResponse.success(response, "Đăng nhập thành công"));
    }

    @PostMapping("/logout")
    @Operation(summary = "Đăng xuất")
    public ResponseEntity<ApiResponse<String>> logout() {
        return ResponseEntity.ok(ApiResponse.success("Đăng xuất thành công"));
    }

    @GetMapping("/me")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy thông tin người dùng hiện tại (DDD)")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(
            @AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("Không được phép truy cập"));
        }

        UserResponse response = getCurrentUserUseCase.execute(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/profile")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Cập nhật thông tin cá nhân (DDD)")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("Không được phép truy cập"));
        }

        UpdateProfileCommand command = new UpdateProfileCommand(
            currentUser.getId(),
            request.fullName(),
            request.email()
        );

        UserResponse response = updateProfileUseCase.execute(currentUser.getId(), command);
        return ResponseEntity.ok(ApiResponse.success(response, "Cập nhật thành công"));
    }

    @PutMapping("/password")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Thay đổi mật khẩu (DDD)")
    public ResponseEntity<ApiResponse<String>> changePassword(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("Không được phép truy cập"));
        }

        changePasswordUseCase.execute(
            currentUser.getId(),
            request.currentPassword(),
            request.newPassword()
        );
        return ResponseEntity.ok(ApiResponse.success("Mật khẩu đã được thay đổi thành công"));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Làm mới token (DDD)")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request
    ) {
        AuthResponse response = refreshTokenUseCase.execute(request.refreshToken());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Yêu cầu đặt lại mật khẩu")
    public ResponseEntity<ApiResponse<Map<String, String>>> forgotPassword(
            @RequestBody @Valid ForgotPasswordRequest request) {
        var user = userJpaRepository.findByEmail(request.email());
        if (user.isPresent()) {
            log.info("Password reset requested for: {}", request.email());
        }
        // Always return success to prevent email enumeration
        return ResponseEntity.ok(ApiResponse.success(
            Map.of("message", "Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu"),
            "Yêu cầu đặt lại mật khẩu đã được gửi"));
    }

    // ==================== Request DTOs ====================

    public record ForgotPasswordRequest(
            @NotBlank(message = "Email không được để trống")
            @Email(message = "Email không hợp lệ")
            String email
    ) {}

    public record RefreshTokenRequest(
            @NotBlank(message = "Refresh token không được để trống")
            String refreshToken
    ) {}

    public record RegisterRequest(
        @NotBlank(message = "Tên đăng nhập không được để trống")
        @Size(min = 3, max = 50, message = "Tên đăng nhập phải từ 3 đến 50 ký tự")
        String username,
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        String email,
        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự")
        String password,
        @NotBlank(message = "Họ tên không được để trống")
        String fullName,
        String role
    ) {}

    public record LoginRequest(
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        String email,
        @NotBlank(message = "Mật khẩu không được để trống")
        String password
    ) {}

    public record UpdateProfileRequest(
        @Size(max = 255, message = "Họ tên không được vượt quá 255 ký tự")
        String fullName,
        @Email(message = "Email không hợp lệ")
        String email
    ) {}

    public record ChangePasswordRequest(
        @NotBlank(message = "Mật khẩu hiện tại không được để trống")
        String currentPassword,
        @NotBlank(message = "Mật khẩu mới không được để trống")
        @Size(min = 6, message = "Mật khẩu mới phải có ít nhất 6 ký tự")
        String newPassword
    ) {}
}
