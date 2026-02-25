package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.AuthResponse;
import com.example.lms.identity.application.dto.UserResponse;
import com.example.lms.identity.application.port.TokenService;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Use case for refreshing authentication tokens.
 * V2 - Uses domain UserRepository and TokenService port only.
 *
 * Clean Architecture: No infrastructure imports.
 */
@Service("refreshTokenUseCaseV2")
@RequiredArgsConstructor
public class RefreshTokenUseCaseV2 {

    private final TokenService tokenService;
    private final UserRepository userRepository;

    public AuthResponse execute(String refreshToken) {
        String userEmail = tokenService.extractEmail(refreshToken);

        if (userEmail == null) {
            throw new BusinessRuleException("INVALID_TOKEN", "Token không hợp lệ");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new BusinessRuleException("USER_NOT_FOUND", "Không tìm thấy người dùng"));

        // P1-6: Reject disabled users
        if (!user.isEnabled()) {
            throw new BusinessRuleException("ACCOUNT_DISABLED", "Tài khoản đã bị vô hiệu hóa");
        }

        if (!tokenService.isTokenValid(refreshToken, userEmail)) {
            throw new BusinessRuleException("TOKEN_VERIFICATION_FAILED", "Xác thực refresh token thất bại");
        }

        String accessToken = tokenService.generateAccessToken(
                user.getId().value(), userEmail, user.getRole().name());
        String newRefreshToken = tokenService.generateRefreshToken(
                user.getId().value(), userEmail, user.getRole().name());

        UserResponse userResponse = UserResponse.fromDomain(user);

        return new AuthResponse(accessToken, newRefreshToken, userResponse);
    }
}
