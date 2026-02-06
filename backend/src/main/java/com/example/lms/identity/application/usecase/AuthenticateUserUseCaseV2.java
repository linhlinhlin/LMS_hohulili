package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.AuthResponse;
import com.example.lms.identity.application.dto.AuthenticateCommand;
import com.example.lms.identity.application.dto.UserResponse;
import com.example.lms.identity.application.port.TokenService;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Use case for authenticating a user using DDD domain models.
 *
 * Clean Architecture: No infrastructure imports.
 * Uses domain UserRepository and TokenService port only.
 */
@Service("authenticateUserUseCaseV2")
@RequiredArgsConstructor
@Slf4j
public class AuthenticateUserUseCaseV2 {

    @Qualifier("newUserRepositoryAdapter")
    private final UserRepository userRepository;
    private final TokenService tokenService;
    private final PasswordEncoder passwordEncoder;

    public AuthResponse execute(AuthenticateCommand command) {
        log.info("Authenticating user (V2): {}", command.email());

        // Find user by email or username using domain repository
        User user = userRepository.findByEmail(command.email())
            .or(() -> userRepository.findByUsername(command.email()))
            .orElseThrow(() -> new UnauthorizedException("User không tồn tại"));

        // Check if enabled
        if (!user.isEnabled()) {
            throw new UnauthorizedException("Tài khoản đã bị vô hiệu hóa");
        }

        // Verify password
        if (!passwordEncoder.matches(command.password(), user.getPassword())) {
            log.warn("Authentication failed for {}: incorrect password", command.email());
            throw new UnauthorizedException("Thông tin đăng nhập không chính xác");
        }

        // Generate tokens via domain port
        String email = user.getEmail() != null ? user.getEmail().getValue() : user.getUsername();
        String accessToken = tokenService.generateAccessToken(
                user.getId().value(), email, user.getRole().name());
        String refreshToken = tokenService.generateRefreshToken(
                user.getId().value(), email, user.getRole().name());

        log.info("User authenticated successfully (V2): {}", user.getId());

        return new AuthResponse(
            accessToken,
            refreshToken,
            UserResponse.fromDomain(user)
        );
    }
}
