package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.AuthResponse;
import com.example.lms.identity.application.dto.UserResponse;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.identity.infrastructure.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service("refreshTokenUseCaseV2")
@RequiredArgsConstructor
public class RefreshTokenUseCaseV2 {

    private final JwtService jwtService;
    private final UserJpaRepository userRepository;

    public AuthResponse execute(String refreshToken) {
        String userEmail = jwtService.extractUsername(refreshToken);
        
        if (userEmail == null) {
            throw new RuntimeException("Invalid token");
        }

        UserJpaEntity user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        if (!jwtService.isTokenValid(refreshToken, user)) {
            throw new RuntimeException("Refresh token verified failed");
        }

        String accessToken = jwtService.generateToken(user);
        // Rotate refresh token? Typically yes, but for now we can keep or rotate.
        // Let's rotate it for security matching legacy behavior if appropriate.
        String newRefreshToken = jwtService.generateRefreshToken(user);

        UserResponse userResponse = new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                user.getEnabled()
        );

        return new AuthResponse(accessToken, newRefreshToken, userResponse);
    }
}
