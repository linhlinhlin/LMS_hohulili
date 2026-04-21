package com.example.lms.identity.infrastructure.web;

import com.example.lms.identity.application.dto.AuthResponse;
import com.example.lms.identity.application.dto.AuthenticateCommand;
import com.example.lms.identity.application.dto.AuthenticateWithGoogleCommand;
import com.example.lms.identity.application.dto.DiscoverAuthOptionsCommand;
import com.example.lms.identity.application.dto.DiscoverAuthOptionsResponse;
import com.example.lms.identity.application.dto.RegisterUserCommand;
import com.example.lms.identity.application.dto.UpdateProfileCommand;
import com.example.lms.identity.application.dto.UserResponse;
import com.example.lms.identity.application.usecase.AuthenticateUserUseCaseV2;
import com.example.lms.identity.application.usecase.AuthenticateWithGoogleUseCase;
import com.example.lms.identity.application.usecase.ChangePasswordUseCaseV2;
import com.example.lms.identity.application.usecase.DiscoverAuthOptionsUseCase;
import com.example.lms.identity.application.usecase.GetCurrentUserUseCaseV2;
import com.example.lms.identity.application.usecase.RefreshTokenUseCaseV2;
import com.example.lms.identity.application.usecase.RegisterUserUseCaseV2;
import com.example.lms.identity.application.usecase.RequestPasswordResetUseCase;
import com.example.lms.identity.application.usecase.ResetPasswordUseCase;
import com.example.lms.identity.application.usecase.SendVerificationEmailUseCase;
import com.example.lms.identity.application.usecase.UpdateProfileUseCaseV2;
import com.example.lms.identity.application.usecase.VerifyEmailUseCase;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.application.port.EmailServicePort;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v3/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication v3", description = "Authentication APIs")
public class AuthControllerV3 {

    @Qualifier("registerUserUseCaseV2")
    private final RegisterUserUseCaseV2 registerUseCase;

    @Qualifier("authenticateUserUseCaseV2")
    private final AuthenticateUserUseCaseV2 authenticateUseCase;

    private final DiscoverAuthOptionsUseCase discoverAuthOptionsUseCase;

    @Qualifier("getCurrentUserUseCaseV2")
    private final GetCurrentUserUseCaseV2 getCurrentUserUseCase;

    @Qualifier("updateProfileUseCaseV2")
    private final UpdateProfileUseCaseV2 updateProfileUseCase;

    @Qualifier("changePasswordUseCaseV2")
    private final ChangePasswordUseCaseV2 changePasswordUseCase;

    @Qualifier("refreshTokenUseCaseV2")
    private final RefreshTokenUseCaseV2 refreshTokenUseCase;

    private final AuthenticateWithGoogleUseCase authenticateWithGoogleUseCase;
    private final RequestPasswordResetUseCase requestPasswordResetUseCase;
    private final ResetPasswordUseCase resetPasswordUseCase;
    private final SendVerificationEmailUseCase sendVerificationEmailUseCase;
    private final VerifyEmailUseCase verifyEmailUseCase;
    private final EmailServicePort emailService;
    private final com.example.lms.identity.infrastructure.security.GoogleOAuthProperties googleOAuthProperties;

    @Value("${app.auth.google.enabled:false}")
    private boolean googleAuthEnabled;

    @Value("${app.auth.google.web-client-id:}")
    private String googleWebClientId;

    @PostMapping("/register")
    @Operation(summary = "Dang ky tai khoan moi")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        RegisterUserCommand command = new RegisterUserCommand(
                request.username(),
                request.email(),
                request.password(),
                request.fullName(),
                request.role(),
                request.inviteCode()
        );

        AuthResponse response = registerUseCase.execute(command);

        try {
            emailService.sendWelcome(request.email(), request.fullName());
        } catch (Exception e) {
            log.warn("Failed to send welcome email to {}: {}", request.email(), e.getMessage());
        }

        try {
            sendVerificationEmailUseCase.execute(response.user().id());
        } catch (Exception e) {
            log.warn("Failed to send verification email to {}: {}", request.email(), e.getMessage());
        }

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Dang ky thanh cong"));
    }

    @PostMapping("/login")
    @Operation(summary = "Dang nhap")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request
    ) {
        AuthenticateCommand command = new AuthenticateCommand(
                request.email(),
                request.password()
        );

        AuthResponse response = authenticateUseCase.execute(command);
        return ResponseEntity.ok(ApiResponse.success(response, "Dang nhap thanh cong"));
    }

    @PostMapping("/lookup")
    @Operation(summary = "Kiem tra phuong thuc dang nhap phu hop theo email")
    public ResponseEntity<ApiResponse<DiscoverAuthOptionsResponse>> lookupAuthOptions(
            @Valid @RequestBody AuthLookupRequest request
    ) {
        DiscoverAuthOptionsResponse response = discoverAuthOptionsUseCase.execute(
                new DiscoverAuthOptionsCommand(request.email())
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/google")
    @Operation(summary = "Dang nhap hoac dang ky bang Google")
    public ResponseEntity<ApiResponse<AuthResponse>> loginWithGoogle(
            @Valid @RequestBody GoogleLoginRequest request
    ) {
        AuthResponse response = authenticateWithGoogleUseCase.execute(
                new AuthenticateWithGoogleCommand(request.idToken(), request.inviteCode())
        );
        return ResponseEntity.ok(ApiResponse.success(response, "Dang nhap Google thanh cong"));
    }

    @GetMapping("/google/config")
    @Operation(summary = "Lay cau hinh Google sign-in cho frontend")
    public ResponseEntity<ApiResponse<GoogleAuthConfigResponse>> getGoogleAuthConfig() {
        boolean enabled = googleAuthEnabled
                && googleWebClientId != null
                && !googleWebClientId.isBlank();
        // Redirect flow only advertised when fully configured — FE falls back to GSI button otherwise.
        boolean redirectFlow = enabled && googleOAuthProperties.isFullyConfigured();
        return ResponseEntity.ok(ApiResponse.success(new GoogleAuthConfigResponse(
                enabled,
                enabled ? googleWebClientId : null,
                redirectFlow,
                redirectFlow ? "/api/v3/auth/google/authorize" : null
        )));
    }

    @PostMapping("/logout")
    @Operation(summary = "Dang xuat")
    public ResponseEntity<ApiResponse<String>> logout() {
        return ResponseEntity.ok(ApiResponse.success("Dang xuat thanh cong"));
    }

    @GetMapping("/me")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lay thong tin nguoi dung hien tai")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(
            @AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Khong duoc phep truy cap"));
        }

        UserResponse response = getCurrentUserUseCase.execute(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/profile")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Cap nhat thong tin ca nhan")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Khong duoc phep truy cap"));
        }

        UpdateProfileCommand command = new UpdateProfileCommand(
                currentUser.getId(),
                request.fullName(),
                request.email(),
                request.avatarUrl()
        );

        UserResponse response = updateProfileUseCase.execute(currentUser.getId(), command);
        return ResponseEntity.ok(ApiResponse.success(response, "Cap nhat thanh cong"));
    }

    @PutMapping("/password")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Thay doi mat khau")
    public ResponseEntity<ApiResponse<String>> changePassword(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Khong duoc phep truy cap"));
        }

        changePasswordUseCase.execute(
                currentUser.getId(),
                request.currentPassword(),
                request.newPassword()
        );
        return ResponseEntity.ok(ApiResponse.success("Mat khau da duoc thay doi thanh cong"));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Lam moi token")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @Valid @RequestBody RefreshTokenRequestBody request
    ) {
        AuthResponse response = refreshTokenUseCase.execute(request.refreshToken());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Yêu cầu đặt lại mật khẩu")
    public ResponseEntity<ApiResponse<Map<String, String>>> forgotPassword(
            @RequestBody @Valid ForgotPasswordRequest request
    ) {
        requestPasswordResetUseCase.execute(request.email());
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("message", "Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu"),
                "Yêu cầu đặt lại mật khẩu đã được gửi"
        ));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Đặt lại mật khẩu bằng token")
    public ResponseEntity<ApiResponse<String>> resetPassword(
            @RequestBody @Valid ResetPasswordRequest request
    ) {
        resetPasswordUseCase.execute(request.token(), request.newPassword());
        return ResponseEntity.ok(ApiResponse.success("Mật khẩu đã được đặt lại thành công"));
    }

    @PostMapping("/verify-email")
    @Operation(summary = "Xác nhận email bằng token")
    public ResponseEntity<ApiResponse<String>> verifyEmail(
            @RequestParam @NotBlank(message = "Token không được để trống") String token
    ) {
        verifyEmailUseCase.execute(token);
        return ResponseEntity.ok(ApiResponse.success("Email đã được xác nhận thành công"));
    }

    @PostMapping("/resend-verification")
    @Operation(summary = "Gửi lại email xác nhận")
    public ResponseEntity<ApiResponse<Map<String, String>>> resendVerification(
            @RequestBody @Valid ResendVerificationRequest request
    ) {
        sendVerificationEmailUseCase.resend(request.email());
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("message", "Nếu email tồn tại, bạn sẽ nhận được email xác nhận"),
                "Yêu cầu gửi lại email xác nhận đã được xử lý"
        ));
    }

    public record ForgotPasswordRequest(
            @NotBlank(message = "Email không được để trống")
            @Email(message = "Email không hợp lệ")
            String email
    ) {}

    public record ResetPasswordRequest(
            @NotBlank(message = "Token không được để trống")
            String token,
            @NotBlank(message = "Mật khẩu mới không được để trống")
            @Size(min = 8, max = 128, message = "Mật khẩu mới phải có từ 8 đến 128 ký tự")
            String newPassword
    ) {}

    public record RefreshTokenRequestBody(
            @NotBlank(message = "Refresh token khong duoc de trong")
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
            @Size(min = 8, max = 128, message = "Mật khẩu phải có từ 8 đến 128 ký tự")
            String password,
            @NotBlank(message = "Họ tên không được để trống")
            String fullName,
            String role,
            String inviteCode
    ) {}

    public record LoginRequest(
            @NotBlank(message = "Email không được để trống")
            @Email(message = "Email không hợp lệ")
            String email,
            @NotBlank(message = "Mật khẩu không được để trống")
            String password
    ) {}

    public record AuthLookupRequest(
            @NotBlank(message = "Email không được để trống")
            @Email(message = "Email không hợp lệ")
            String email
    ) {}

    public record UpdateProfileRequest(
            @Size(max = 255, message = "Họ tên không được vượt quá 255 ký tự")
            String fullName,
            @Email(message = "Email không hợp lệ")
            String email,
            @Size(max = 500, message = "URL avatar không được vượt quá 500 ký tự")
            String avatarUrl
    ) {}

    public record ChangePasswordRequest(
            @NotBlank(message = "Mật khẩu hiện tại không được để trống")
            String currentPassword,
            @NotBlank(message = "Mật khẩu mới không được để trống")
            @Size(min = 8, max = 128, message = "Mật khẩu mới phải có từ 8 đến 128 ký tự")
            String newPassword
    ) {}

    public record ResendVerificationRequest(
            @NotBlank(message = "Email không được để trống")
            @Email(message = "Email không hợp lệ")
            String email
    ) {}

    public record GoogleLoginRequest(
            @NotBlank(message = "Google credential khong duoc de trong")
            String idToken,
            String inviteCode
    ) {}

    public record GoogleAuthConfigResponse(
            boolean enabled,
            String clientId,
            /** True when the server-side authorization-code flow is configured and FE should prefer it. */
            boolean redirectFlowEnabled,
            /** Path to navigate to for the redirect flow, e.g. "/api/v3/auth/google/authorize". */
            String authorizeUrl
    ) {}
}
