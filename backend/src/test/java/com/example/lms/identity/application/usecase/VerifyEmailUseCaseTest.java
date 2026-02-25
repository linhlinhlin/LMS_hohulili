package com.example.lms.identity.application.usecase;

import com.example.lms.identity.domain.model.EmailVerificationToken;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.EmailVerificationTokenRepository;
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

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Tests for VerifyEmailUseCase.
 *
 * Verifies:
 * - Successful verification flow
 * - Invalid token rejection
 * - Already verified token rejection
 * - Expired token rejection
 * - Token marked as verified
 * - User account enabled
 * - User saved after enabling
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("VerifyEmailUseCase")
class VerifyEmailUseCaseTest {

    @Mock
    private EmailVerificationTokenRepository tokenRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private VerifyEmailUseCase useCase;

    private final String rawToken = "valid-raw-token-for-testing";
    private final UUID tokenUserId = UUID.randomUUID();

    @Nested
    @DisplayName("Successful verification")
    class SuccessfulVerification {

        @Test
        @DisplayName("Should verify successfully with valid token")
        void shouldVerifySuccessfully() {
            var token = validToken();
            String tokenHash = com.example.lms.shared.domain.util.HashUtil.sha256(rawToken);
            when(tokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));

            var user = mock(User.class);
            when(userRepository.findById(UserId.of(tokenUserId))).thenReturn(Optional.of(user));

            assertThatCode(() -> useCase.execute(rawToken))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should mark token as verified")
        void shouldMarkTokenAsVerified() {
            var token = validToken();
            String tokenHash = com.example.lms.shared.domain.util.HashUtil.sha256(rawToken);
            when(tokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));

            var user = mock(User.class);
            when(userRepository.findById(UserId.of(tokenUserId))).thenReturn(Optional.of(user));

            useCase.execute(rawToken);

            verify(tokenRepository).markVerifiedByTokenHash(tokenHash);
        }

        @Test
        @DisplayName("Should enable user account")
        void shouldEnableUserAccount() {
            var token = validToken();
            String tokenHash = com.example.lms.shared.domain.util.HashUtil.sha256(rawToken);
            when(tokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));

            var user = mock(User.class);
            when(userRepository.findById(UserId.of(tokenUserId))).thenReturn(Optional.of(user));

            useCase.execute(rawToken);

            verify(user).enable();
        }

        @Test
        @DisplayName("Should save user after enabling")
        void shouldSaveUserAfterEnabling() {
            var token = validToken();
            String tokenHash = com.example.lms.shared.domain.util.HashUtil.sha256(rawToken);
            when(tokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));

            var user = mock(User.class);
            when(userRepository.findById(UserId.of(tokenUserId))).thenReturn(Optional.of(user));

            useCase.execute(rawToken);

            verify(userRepository).save(user);
        }
    }

    @Nested
    @DisplayName("Token validation errors")
    class TokenValidationErrors {

        @Test
        @DisplayName("Should throw for invalid/non-existent token")
        void shouldThrowForInvalidToken() {
            String invalidToken = "invalid-token-does-not-exist";
            String tokenHash = com.example.lms.shared.domain.util.HashUtil.sha256(invalidToken);
            when(tokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> useCase.execute(invalidToken))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("Token xác nhận không hợp lệ hoặc đã hết hạn");
        }

        @Test
        @DisplayName("Should throw for already verified token")
        void shouldThrowForAlreadyVerifiedToken() {
            var verifiedToken = new EmailVerificationToken(
                    UUID.randomUUID(),
                    tokenUserId,
                    com.example.lms.shared.domain.util.HashUtil.sha256(rawToken),
                    Instant.now().plus(24, ChronoUnit.HOURS),   // Not expired
                    Instant.now().minus(1, ChronoUnit.HOURS),   // Already verified
                    Instant.now().minus(2, ChronoUnit.HOURS)
            );
            String tokenHash = com.example.lms.shared.domain.util.HashUtil.sha256(rawToken);
            when(tokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(verifiedToken));

            assertThatThrownBy(() -> useCase.execute(rawToken))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("Email đã được xác nhận trước đó");
        }

        @Test
        @DisplayName("Should throw for expired token")
        void shouldThrowForExpiredToken() {
            var expiredToken = new EmailVerificationToken(
                    UUID.randomUUID(),
                    tokenUserId,
                    com.example.lms.shared.domain.util.HashUtil.sha256(rawToken),
                    Instant.now().minus(1, ChronoUnit.HOURS),   // Expired 1 hour ago
                    null,                                        // Not verified
                    Instant.now().minus(25, ChronoUnit.HOURS)
            );
            String tokenHash = com.example.lms.shared.domain.util.HashUtil.sha256(rawToken);
            when(tokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(expiredToken));

            assertThatThrownBy(() -> useCase.execute(rawToken))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("Token xác nhận đã hết hạn. Vui lòng yêu cầu gửi lại.");
        }
    }

    /**
     * Creates a valid (not expired, not verified) email verification token.
     */
    private EmailVerificationToken validToken() {
        return new EmailVerificationToken(
                UUID.randomUUID(),
                tokenUserId,
                com.example.lms.shared.domain.util.HashUtil.sha256(rawToken),
                Instant.now().plus(24, ChronoUnit.HOURS),   // Not expired
                null,                                        // Not verified
                Instant.now().minus(1, ChronoUnit.HOURS)     // Created 1 hour ago
        );
    }
}
