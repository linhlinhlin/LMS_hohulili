package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.AuthResponse;
import com.example.lms.identity.application.dto.AuthenticateCommand;
import com.example.lms.identity.application.dto.UserResponse;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.identity.infrastructure.security.JwtTokenAdapter;
import com.example.lms.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Use case for authenticating a user using DDD domain models.
 * 
 * This is the CLEAN version that uses:
 * - Domain model (User) instead of JPA entity
 * - Domain repository (UserRepository) instead of legacy UserDomainRepository
 * 
 * Following Clean Architecture / Hexagonal Architecture principles.
 */
@Service("authenticateUserUseCaseV2")
@RequiredArgsConstructor
@Slf4j
public class AuthenticateUserUseCaseV2 {

    @Qualifier("newUserRepositoryAdapter")
    private final UserRepository userRepository;
    private final JwtTokenAdapter jwtTokenAdapter;
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

        // Generate tokens using adapter
        String accessToken = jwtTokenAdapter.generateAccessToken(user);
        String refreshToken = jwtTokenAdapter.generateRefreshToken(user);

        log.info("User authenticated successfully (V2): {}", user.getId());

        return new AuthResponse(
            accessToken,
            refreshToken,
            UserResponse.fromDomain(user)
        );
    }
}
