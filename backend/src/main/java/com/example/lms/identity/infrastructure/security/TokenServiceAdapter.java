package com.example.lms.identity.infrastructure.security;

import com.example.lms.identity.application.port.TokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Infrastructure adapter bridging the domain TokenService port to JwtService.
 * Converts domain primitives into Spring Security UserDetails as needed by JwtService.
 */
@Component
@RequiredArgsConstructor
public class TokenServiceAdapter implements TokenService {

    private final JwtService jwtService;

    @Override
    public String extractEmail(String token) {
        return jwtService.extractUsername(token);
    }

    @Override
    public boolean isTokenValid(String token, String email) {
        UserDetails userDetails = toUserDetails(email);
        return jwtService.isTokenValid(token, userDetails);
    }

    @Override
    public String generateAccessToken(UUID userId, String email, String role) {
        Map<String, Object> claims = Map.of(
            "userId", userId.toString(),
            "role", role
        );
        UserDetails userDetails = toUserDetails(email);
        return jwtService.generateToken(claims, userDetails);
    }

    @Override
    public String generateRefreshToken(UUID userId, String email, String role) {
        UserDetails userDetails = toUserDetails(email);
        return jwtService.generateRefreshToken(userDetails);
    }

    private UserDetails toUserDetails(String email) {
        return new User(email, "", List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }
}
