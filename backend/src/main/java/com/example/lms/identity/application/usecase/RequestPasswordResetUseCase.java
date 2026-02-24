package com.example.lms.identity.application.usecase;

import com.example.lms.identity.domain.repository.PasswordResetTokenRepository;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.application.port.EmailServicePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Generates a password reset token and sends email.
 * OWASP: anti-enumeration (always success), 30min expiry, SHA-256 hash storage.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RequestPasswordResetUseCase {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailServicePort emailService;

    @Value("${app.email.base-url:http://localhost:4200}")
    private String baseUrl;

    private static final int TOKEN_EXPIRY_MINUTES = 30;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Transactional
    public void execute(String email) {
        var userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            log.debug("Password reset requested for non-existent email: {}", email);
            return; // Anti-enumeration: silently ignore
        }

        var user = userOpt.get();

        // Delete any existing unused tokens for this user
        tokenRepository.deleteUnusedByUserId(user.getId().value());

        // Generate cryptographically secure token
        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        // Store SHA-256 hash (never store raw token)
        String tokenHash = sha256(rawToken);
        Instant expiresAt = Instant.now().plus(TOKEN_EXPIRY_MINUTES, ChronoUnit.MINUTES);
        tokenRepository.save(user.getId().value(), tokenHash, expiresAt);

        // Send reset email
        String resetLink = baseUrl + "/auth/reset-password?token=" + rawToken;
        emailService.sendPasswordReset(user.getEmail().getValue(), user.getFullName(), resetLink);

        log.info("Password reset token created for user: {}", user.getId());
    }

    static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
