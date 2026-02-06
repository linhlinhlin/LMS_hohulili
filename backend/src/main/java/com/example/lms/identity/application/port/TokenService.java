package com.example.lms.identity.application.port;

import java.util.UUID;

/**
 * Application port for token operations.
 * Abstracts away JWT/token infrastructure details from the application layer.
 */
public interface TokenService {

    /**
     * Extract the user email (subject) from a token.
     */
    String extractEmail(String token);

    /**
     * Validate a token against a user's email.
     * Returns true if the token is valid and not expired.
     */
    boolean isTokenValid(String token, String email);

    /**
     * Generate a new access token for the given user.
     */
    String generateAccessToken(UUID userId, String email, String role);

    /**
     * Generate a new refresh token for the given user.
     */
    String generateRefreshToken(UUID userId, String email, String role);
}
