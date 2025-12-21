package com.example.lms.identity.infrastructure.security;

import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.mapper.UserEntityMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Adapter that bridges domain User model to Spring Security JWT operations.
 * Uses JwtService for actual token generation.
 */
@Component
@RequiredArgsConstructor
public class JwtTokenAdapter {

    private final JwtService jwtService;
    private final UserEntityMapper userEntityMapper;

    /**
     * Generate an access token for a domain User.
     */
    public String generateAccessToken(User domainUser) {
        UserJpaEntity userDetails = userEntityMapper.toEntity(domainUser);
        return jwtService.generateToken(userDetails);
    }

    /**
     * Generate a refresh token for a domain User.
     */
    public String generateRefreshToken(User domainUser) {
        UserJpaEntity userDetails = userEntityMapper.toEntity(domainUser);
        return jwtService.generateRefreshToken(userDetails);
    }

    /**
     * Validate a token against a domain User.
     */
    public boolean isTokenValid(String token, User domainUser) {
        UserJpaEntity userDetails = userEntityMapper.toEntity(domainUser);
        return jwtService.isTokenValid(token, userDetails);
    }

    /**
     * Extract username from token.
     */
    public String extractUsername(String token) {
        return jwtService.extractUsername(token);
    }
}
