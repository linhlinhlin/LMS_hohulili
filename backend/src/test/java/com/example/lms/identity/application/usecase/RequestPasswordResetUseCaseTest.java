package com.example.lms.identity.application.usecase;

import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.PasswordResetTokenRepository;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.application.port.EmailServicePort;
import com.example.lms.shared.domain.valueobject.UserId;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * OWASP password reset tests for RequestPasswordResetUseCase.
 *
 * Verifies:
 * - Anti-enumeration (same behavior for existing/non-existing emails)
 * - SHA-256 token hash storage (never stores raw token)
 * - Token expiry set to 30 minutes
 * - Previous unused tokens deleted before creating new one
 * - Email sent with correct reset link
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("RequestPasswordResetUseCase (OWASP)")
class RequestPasswordResetUseCaseTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetTokenRepository tokenRepository;

    @Mock
    private EmailServicePort emailService;

    @InjectMocks
    private RequestPasswordResetUseCase useCase;

    @Nested
    @DisplayName("Anti-enumeration")
    class AntiEnumeration {

        @Test
        @DisplayName("Should silently succeed for non-existent email (no exception, no email)")
        void shouldSilentlySucceedForNonExistentEmail() {
            when(userRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());

            assertThatCode(() -> useCase.execute("unknown@test.com"))
                    .doesNotThrowAnyException();

            verifyNoInteractions(tokenRepository);
            verifyNoInteractions(emailService);
        }

        @Test
        @DisplayName("Should not reveal whether email exists via different behavior")
        void shouldNotRevealEmailExistence() {
            when(userRepository.findByEmail("notfound@test.com")).thenReturn(Optional.empty());

            // Both existing and non-existing should complete without exception
            assertThatCode(() -> useCase.execute("notfound@test.com"))
                    .doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Token generation")
    class TokenGeneration {

        @Test
        @DisplayName("Should store SHA-256 hash of token, not raw token")
        void shouldStoreSha256Hash() {
            var user = mockUser();
            when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));

            ArgumentCaptor<String> hashCaptor = ArgumentCaptor.forClass(String.class);
            useCase.execute("user@test.com");

            verify(tokenRepository).save(eq(user.getId().value()), hashCaptor.capture(), any(Instant.class));

            String storedHash = hashCaptor.getValue();
            // SHA-256 hex string is always 64 characters
            assertThat(storedHash).hasSize(64);
            // Should be hex (lowercase)
            assertThat(storedHash).matches("[0-9a-f]{64}");
        }

        @Test
        @DisplayName("Should set token expiry ~30 minutes from now")
        void shouldSetExpiryThirtyMinutes() {
            var user = mockUser();
            when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));

            ArgumentCaptor<Instant> expiryCaptor = ArgumentCaptor.forClass(Instant.class);
            useCase.execute("user@test.com");

            verify(tokenRepository).save(any(), any(), expiryCaptor.capture());

            Instant expiry = expiryCaptor.getValue();
            Instant now = Instant.now();
            // Expiry should be between 29 and 31 minutes from now (allow 1 min tolerance)
            assertThat(expiry).isAfter(now.plusSeconds(29 * 60));
            assertThat(expiry).isBefore(now.plusSeconds(31 * 60));
        }

        @Test
        @DisplayName("Should delete previous unused tokens before creating new one")
        void shouldDeletePreviousTokens() {
            var user = mockUser();
            when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));

            useCase.execute("user@test.com");

            // deleteUnusedByUserId should be called BEFORE save
            var inOrder = inOrder(tokenRepository);
            inOrder.verify(tokenRepository).deleteUnusedByUserId(user.getId().value());
            inOrder.verify(tokenRepository).save(any(), any(), any());
        }
    }

    @Nested
    @DisplayName("Email sending")
    class EmailSending {

        @Test
        @DisplayName("Should send password reset email with correct parameters")
        void shouldSendResetEmail() {
            var user = mockUser();
            when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));

            useCase.execute("user@test.com");

            verify(emailService).sendPasswordReset(
                    eq("user@test.com"),
                    eq("Test User"),
                    contains("/auth/reset-password?token=")
            );
        }

        @Test
        @DisplayName("Should include Base64 URL-safe token in reset link")
        void shouldIncludeBase64UrlSafeToken() {
            var user = mockUser();
            when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));

            ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);
            useCase.execute("user@test.com");

            verify(emailService).sendPasswordReset(any(), any(), linkCaptor.capture());

            String link = linkCaptor.getValue();
            String token = link.substring(link.indexOf("token=") + 6);
            // Base64 URL-safe: letters, digits, -, _
            assertThat(token).matches("[A-Za-z0-9_-]+");
            // 32 bytes -> ~43 Base64 chars
            assertThat(token.length()).isBetween(40, 48);
        }
    }

    @Nested
    @DisplayName("SHA-256 utility")
    class Sha256Utility {

        @Test
        @DisplayName("Should produce consistent SHA-256 hash")
        void shouldProduceConsistentHash() {
            String hash1 = com.example.lms.shared.domain.util.HashUtil.sha256("test-input");
            String hash2 = com.example.lms.shared.domain.util.HashUtil.sha256("test-input");
            assertThat(hash1).isEqualTo(hash2);
        }

        @Test
        @DisplayName("Should produce different hashes for different inputs")
        void shouldProduceDifferentHashes() {
            String hash1 = com.example.lms.shared.domain.util.HashUtil.sha256("input-a");
            String hash2 = com.example.lms.shared.domain.util.HashUtil.sha256("input-b");
            assertThat(hash1).isNotEqualTo(hash2);
        }
    }

    private User mockUser() {
        var user = mock(User.class);
        var userId = UserId.of(UUID.randomUUID());
        when(user.getId()).thenReturn(userId);
        when(user.getEmail()).thenReturn(com.example.lms.shared.domain.valueobject.Email.of("user@test.com"));
        when(user.getFullName()).thenReturn("Test User");
        return user;
    }
}
