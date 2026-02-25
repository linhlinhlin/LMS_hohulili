package com.example.lms.identity.application.usecase;

import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.EmailVerificationTokenRepository;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.application.port.EmailServicePort;
import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.domain.valueobject.UserId;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.quality.Strictness;
import org.mockito.junit.jupiter.MockitoSettings;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests for SendVerificationEmailUseCase.
 *
 * Verifies:
 * - Anti-enumeration (silent for non-existent user)
 * - Old token cleanup before new token creation
 * - SHA-256 hash storage (64 hex chars)
 * - 24h token expiry
 * - Email sending with verification link
 * - Resend anti-enumeration
 * - SHA-256 consistency
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("SendVerificationEmailUseCase")
class SendVerificationEmailUseCaseTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailVerificationTokenRepository tokenRepository;

    @Mock
    private EmailServicePort emailService;

    @InjectMocks
    private SendVerificationEmailUseCase useCase;

    private final UUID userId = UUID.randomUUID();

    private User mockUser() {
        var user = mock(User.class);
        var id = UserId.of(userId);
        when(user.getId()).thenReturn(id);
        when(user.getEmail()).thenReturn(Email.of("user@test.com"));
        when(user.getFullName()).thenReturn("Test User");
        return user;
    }

    @Nested
    @DisplayName("Anti-enumeration")
    class AntiEnumeration {

        @Test
        @DisplayName("Should silently succeed for non-existent user (no exception, no email)")
        void shouldSilentlySucceedForNonExistentUser() {
            when(userRepository.findById(UserId.of(userId))).thenReturn(Optional.empty());

            assertThatCode(() -> useCase.execute(userId))
                    .doesNotThrowAnyException();

            verifyNoInteractions(tokenRepository);
            verifyNoInteractions(emailService);
        }
    }

    @Nested
    @DisplayName("Token management")
    class TokenManagement {

        @Test
        @DisplayName("Should delete old unverified tokens before saving new one")
        void shouldDeleteOldTokensBeforeSave() {
            var user = mockUser();
            when(userRepository.findById(UserId.of(userId))).thenReturn(Optional.of(user));
            ReflectionTestUtils.setField(useCase, "baseUrl", "http://localhost:4200");

            useCase.execute(userId);

            var inOrder = inOrder(tokenRepository);
            inOrder.verify(tokenRepository).deleteUnverifiedByUserId(userId);
            inOrder.verify(tokenRepository).save(eq(userId), anyString(), any(Instant.class));
        }

        @Test
        @DisplayName("Should store SHA-256 hash of token (64 hex chars)")
        void shouldStoreSha256Hash() {
            var user = mockUser();
            when(userRepository.findById(UserId.of(userId))).thenReturn(Optional.of(user));
            ReflectionTestUtils.setField(useCase, "baseUrl", "http://localhost:4200");

            ArgumentCaptor<String> hashCaptor = ArgumentCaptor.forClass(String.class);
            useCase.execute(userId);

            verify(tokenRepository).save(eq(userId), hashCaptor.capture(), any(Instant.class));

            String storedHash = hashCaptor.getValue();
            assertThat(storedHash).hasSize(64);
            assertThat(storedHash).matches("[0-9a-f]{64}");
        }

        @Test
        @DisplayName("Should set token expiry ~24 hours from now")
        void shouldSet24HourExpiry() {
            var user = mockUser();
            when(userRepository.findById(UserId.of(userId))).thenReturn(Optional.of(user));
            ReflectionTestUtils.setField(useCase, "baseUrl", "http://localhost:4200");

            ArgumentCaptor<Instant> expiryCaptor = ArgumentCaptor.forClass(Instant.class);
            useCase.execute(userId);

            verify(tokenRepository).save(any(), any(), expiryCaptor.capture());

            Instant expiry = expiryCaptor.getValue();
            Instant now = Instant.now();
            // Expiry should be between 23h59m and 24h01m from now (allow 1 min tolerance)
            assertThat(expiry).isAfter(now.plusSeconds(23 * 3600 + 59 * 60));
            assertThat(expiry).isBefore(now.plusSeconds(24 * 3600 + 60));
        }
    }

    @Nested
    @DisplayName("Email sending")
    class EmailSending {

        @Test
        @DisplayName("Should send verification email with correct parameters")
        void shouldSendVerificationEmail() {
            var user = mockUser();
            when(userRepository.findById(UserId.of(userId))).thenReturn(Optional.of(user));
            ReflectionTestUtils.setField(useCase, "baseUrl", "http://localhost:4200");

            useCase.execute(userId);

            verify(emailService).sendEmailVerification(
                    eq("user@test.com"),
                    eq("Test User"),
                    contains("/auth/verify-email?token=")
            );
        }
    }

    @Nested
    @DisplayName("Resend")
    class Resend {

        @Test
        @DisplayName("Should silently succeed for unknown email (anti-enumeration)")
        void shouldSilentlySucceedForUnknownEmail() {
            when(userRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());

            assertThatCode(() -> useCase.resend("unknown@test.com"))
                    .doesNotThrowAnyException();

            verifyNoInteractions(tokenRepository);
            verifyNoInteractions(emailService);
        }

        @Test
        @DisplayName("Should call execute for known email")
        void shouldCallExecuteForKnownEmail() {
            var user = mockUser();
            when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
            when(userRepository.findById(UserId.of(userId))).thenReturn(Optional.of(user));
            ReflectionTestUtils.setField(useCase, "baseUrl", "http://localhost:4200");

            useCase.resend("user@test.com");

            // Verify the full execute flow ran: tokens deleted + saved + email sent
            verify(tokenRepository).deleteUnverifiedByUserId(userId);
            verify(tokenRepository).save(eq(userId), anyString(), any(Instant.class));
            verify(emailService).sendEmailVerification(eq("user@test.com"), eq("Test User"), anyString());
        }
    }

    @Nested
    @DisplayName("SHA-256 utility")
    class Sha256Utility {

        @Test
        @DisplayName("Should produce consistent SHA-256 output")
        void shouldProduceConsistentOutput() {
            String hash1 = com.example.lms.shared.domain.util.HashUtil.sha256("test-input");
            String hash2 = com.example.lms.shared.domain.util.HashUtil.sha256("test-input");
            assertThat(hash1).isEqualTo(hash2);
            assertThat(hash1).hasSize(64);
            assertThat(hash1).matches("[0-9a-f]{64}");
        }
    }
}
