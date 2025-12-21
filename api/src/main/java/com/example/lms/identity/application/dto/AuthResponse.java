package com.example.lms.identity.application.dto;

/**
 * Response DTO for authentication.
 */
public record AuthResponse(
    String accessToken,
    String refreshToken,
    UserResponse user
) {}
