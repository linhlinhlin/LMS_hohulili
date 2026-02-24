package com.example.lms.identity.application.usecase;

import com.example.lms.identity.domain.model.PasswordResetToken;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.PasswordResetTokenRepository;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.domain.valueobject.UserId;
import com.example.lms.shared.exception.BusinessRuleException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * OWASP password reset tests for ResetPasswordUseCase.
 *
 * Verifies:
 * - Token expiration enforcement
 * - Single-use token (used tokens rejected)
 * - Invalid token rejection
 * - Password policy enforcement (NIST 800-63B-4)
 * - Password encoding (BCrypt)
 * - All tokens invalidated after successful reset
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ResetPasswordUseCase (OWASP)")
class ResetPasswordUseCaseTest {

    @Mock
    private PasswordResetTokenRepository tokenRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private ResetPasswordUseCase useCase;

    @Nested
    @DisplayName("Token validation")
    class TokenValidation {

        @Test
        @DisplayName("Should reject invalid/non-existent token")
        void shouldRejectInvalidToken() {
            String rawToken = "invalid-token-that-does-not-exist";
            String tokenHash = RequestPasswordResetUseCase.sha256(rawToken);
            when(tokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> useCase.execute(rawToken, "newStrongPassword123"))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("không hợp lệ");
        }

        @Test
        @DisplayName("Should reject expired token")
        void shouldRejectExpiredToken() {
            String rawToken = "expired-token-value";
            String tokenHash = RequestPasswordResetUseCase.sha256(rawToken);

            var expiredToken = new PasswordResetToken(
                    UUID.randomUUID(), UUID.randomUUID(), tokenHash,
                    Instant.now().minus(1, ChronoUnit.HOURS), // Expired 1 hour ago
                    null, Instant.now().minus(2, ChronoUnit.HOURS));

            when(tokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(expiredToken));

            assertThatThrownBy(() -> useCase.execute(rawToken, "newStrongPassword123"))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("hết hạn");
        }

        @Test
        @DisplayName("Should reject already-used token (single-use enforcement)")
        void shouldRejectUsedToken() {
            String rawToken = "used-token-value";
            String tokenHash = RequestPasswordResetUseCase.sha256(rawToken);

            var usedToken = new PasswordResetToken(
                    UUID.randomUUID(), UUID.randomUUID(), tokenHash,
                    Instant.now().plus(30, ChronoUnit.MINUTES), // Not expired
                    Instant.now().minus(5, ChronoUnit.MINUTES), // But already used
                    Instant.now().minus(10, ChronoUnit.MINUTES));

            when(tokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(usedToken));

            assertThatThrownBy(() -> useCase.execute(rawToken, "newStrongPassword123"))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("đã được sử dụng");
        }
    }

    @Nested
    @DisplayName("Password policy enforcement")
    class PasswordPolicyEnforcement {

        @Test
        @DisplayName("Should reject weak password (too short)")
        void shouldRejectWeakPassword() {
            String rawToken = "valid-token-value";
            var token = validToken(rawToken);
            when(tokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));

            assertThatThrownBy(() -> useCase.execute(rawToken, "short"))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("ít nhất 8 ký tự");
        }

        @Test
        @DisplayName("Should reject common/breached password")
        void shouldRejectCommonPassword() {
            String rawToken = "valid-token-value";
            var token = validToken(rawToken);
            when(tokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));

            assertThatThrownBy(() -> useCase.execute(rawToken, "password"))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("quá phổ biến");
        }
    }

    @Nested
    @DisplayName("Successful reset")
    class SuccessfulReset {

        @Test
        @DisplayName("Should encode password with BCrypt before saving")
        void shouldEncodePassword() {
            String rawToken = "valid-token-value";
            var token = validToken(rawToken);
            UUID userId = token.getUserId();

            when(tokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));
            when(passwordEncoder.encode("myNewSecurePassword")).thenReturn("$2a$10$encodedHash");
            var user = mock(User.class);
            when(userRepository.findById(UserId.of(userId))).thenReturn(Optional.of(user));

            useCase.execute(rawToken, "myNewSecurePassword");

            verify(passwordEncoder).encode("myNewSecurePassword");
            verify(user).changePassword("$2a$10$encodedHash");
            verify(userRepository).save(user);
        }

        @Test
        @DisplayName("Should mark token as used after successful reset")
        void shouldMarkTokenAsUsed() {
            String rawToken = "valid-token-value";
            var token = validToken(rawToken);
            String tokenHash = RequestPasswordResetUseCase.sha256(rawToken);

            when(tokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));
            when(passwordEncoder.encode(any())).thenReturn("$2a$10$encoded");
            var user = mock(User.class);
            when(userRepository.findById(UserId.of(token.getUserId()))).thenReturn(Optional.of(user));

            useCase.execute(rawToken, "myNewSecurePassword");

            verify(tokenRepository).markUsedByTokenHash(tokenHash);
        }

        @Test
        @DisplayName("Should delete all other unused tokens for user after reset")
        void shouldDeleteAllOtherTokens() {
            String rawToken = "valid-token-value";
            var token = validToken(rawToken);

            when(tokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));
            when(passwordEncoder.encode(any())).thenReturn("$2a$10$encoded");
            var user = mock(User.class);
            when(userRepository.findById(UserId.of(token.getUserId()))).thenReturn(Optional.of(user));

            useCase.execute(rawToken, "myNewSecurePassword");

            // Should delete all unused tokens AFTER marking current as used
            var inOrder = inOrder(tokenRepository);
            inOrder.verify(tokenRepository).markUsedByTokenHash(any());
            inOrder.verify(tokenRepository).deleteUnusedByUserId(token.getUserId());
        }

        @Test
        @DisplayName("Should throw when user not found (data integrity)")
        void shouldThrowWhenUserNotFound() {
            String rawToken = "valid-token-value";
            var token = validToken(rawToken);

            when(tokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));
            when(userRepository.findById(UserId.of(token.getUserId()))).thenReturn(Optional.empty());

            assertThatThrownBy(() -> useCase.execute(rawToken, "myNewSecurePassword"))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("không tồn tại");
        }
    }

    private PasswordResetToken validToken(String rawToken) {
        return new PasswordResetToken(
                UUID.randomUUID(),
                UUID.randomUUID(),
                RequestPasswordResetUseCase.sha256(rawToken),
                Instant.now().plus(30, ChronoUnit.MINUTES), // Not expired
                null,                                        // Not used
                Instant.now().minus(5, ChronoUnit.MINUTES)); // Created 5 min ago
    }
}
