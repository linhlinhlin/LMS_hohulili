package com.example.lms.identity.application.usecase;

import com.example.lms.identity.domain.repository.EmailVerificationTokenRepository;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.application.port.EmailServicePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.lms.shared.domain.util.HashUtil;
import com.example.lms.shared.domain.valueobject.UserId;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;

/**
 * Generates an email verification token and sends email.
 * OWASP: anti-enumeration, 24h expiry, SHA-256 hash storage.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SendVerificationEmailUseCase {

    private final UserRepository userRepository;
    private final EmailVerificationTokenRepository tokenRepository;
    private final EmailServicePort emailService;

    @Value("${app.email.base-url:http://localhost:4200}")
    private String baseUrl;

    private static final int TOKEN_EXPIRY_HOURS = 24;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Transactional
    public void execute(UUID userId) {
        var userOpt = userRepository.findById(UserId.of(userId));
        if (userOpt.isEmpty()) {
            log.debug("Verification email requested for non-existent user: {}", userId);
            return;
        }

        var user = userOpt.get();

        // Delete any existing unverified tokens for this user
        tokenRepository.deleteUnverifiedByUserId(userId);

        // Generate cryptographically secure token
        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        // Store SHA-256 hash
        String tokenHash = HashUtil.sha256(rawToken);
        Instant expiresAt = Instant.now().plus(TOKEN_EXPIRY_HOURS, ChronoUnit.HOURS);
        tokenRepository.save(userId, tokenHash, expiresAt);

        // Send verification email
        String verifyLink = baseUrl + "/auth/verify-email?token=" + rawToken;
        emailService.sendEmailVerification(user.getEmail().getValue(), user.getFullName(), verifyLink);

        log.info("Email verification token created for user: {}", userId);
    }

    /**
     * Resend verification for email (anti-enumeration: always silent).
     */
    @Transactional
    public void resend(String email) {
        var userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            log.debug("Verification resend for non-existent email: {}", email);
            return;
        }
        execute(userOpt.get().getId().value());
    }

}
