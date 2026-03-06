package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.AuthResponse;
import com.example.lms.identity.application.port.TokenService;
import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.domain.valueobject.UserId;
import com.example.lms.shared.exception.BusinessRuleException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for RefreshTokenUseCaseV2.
 *
 * Tests business logic for token refresh including:
 * - Disabled account rejection (P1-6)
 * - Successful token refresh for enabled users
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("RefreshTokenUseCaseV2 Tests")
class RefreshTokenUseCaseV2Test {

    private static final String TEST_EMAIL = "test@mail.com";
    private static final String OLD_REFRESH_TOKEN = "old_refresh_token";
    private static final String NEW_ACCESS_TOKEN = "new_access_token_123";
    private static final String NEW_REFRESH_TOKEN = "new_refresh_token_456";
    private static final long DEFAULT_REFRESH_EXPIRY_MS = 30L * 86_400_000L;

    @Mock
    private TokenService tokenService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private OrganizationRepository organizationRepository;

    @InjectMocks
    private RefreshTokenUseCaseV2 useCase;

    private UserId userId;

    @BeforeEach
    void setUp() {
        userId = UserId.of(UUID.randomUUID());
    }

    @Test
    @DisplayName("Should reject disabled user with ACCOUNT_DISABLED error")
    void shouldRejectDisabledUser() {
        User disabledUser = User.builder()
                .id(userId)
                .username("testuser")
                .email(Email.of(TEST_EMAIL))
                .password("encoded_password")
                .fullName("Test User")
                .role(Role.STUDENT)
                .enabled(false)
                .build();

        when(tokenService.extractEmail(OLD_REFRESH_TOKEN)).thenReturn(TEST_EMAIL);
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(disabledUser));

        assertThatThrownBy(() -> useCase.execute(OLD_REFRESH_TOKEN))
                .isInstanceOfSatisfying(BusinessRuleException.class,
                        exception -> assertThat(exception.getRuleName()).isEqualTo("ACCOUNT_DISABLED"));

        verify(tokenService, never()).isTokenValid(anyString(), anyString());
        verify(tokenService, never()).generateAccessToken(any(), anyString(), anyString(), any());
        verify(tokenService, never()).generateRefreshToken(any(), anyString(), anyString(), anyLong());
    }

    @Test
    @DisplayName("Should refresh tokens successfully for enabled user")
    void shouldRefreshTokenForEnabledUser() {
        User enabledUser = User.builder()
                .id(userId)
                .username("testuser")
                .email(Email.of(TEST_EMAIL))
                .password("encoded_password")
                .fullName("Test User")
                .role(Role.STUDENT)
                .enabled(true)
                .build();

        when(tokenService.extractEmail(OLD_REFRESH_TOKEN)).thenReturn(TEST_EMAIL);
        when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(enabledUser));
        when(tokenService.isTokenValid(OLD_REFRESH_TOKEN, TEST_EMAIL)).thenReturn(true);
        when(tokenService.generateAccessToken(eq(userId.value()), eq(TEST_EMAIL), eq("STUDENT"), isNull()))
                .thenReturn(NEW_ACCESS_TOKEN);
        when(tokenService.generateRefreshToken(eq(userId.value()), eq(TEST_EMAIL), eq("STUDENT"),
                eq(DEFAULT_REFRESH_EXPIRY_MS))).thenReturn(NEW_REFRESH_TOKEN);

        AuthResponse response = useCase.execute(OLD_REFRESH_TOKEN);

        assertThat(response).isNotNull();
        assertThat(response.accessToken()).isEqualTo(NEW_ACCESS_TOKEN);
        assertThat(response.refreshToken()).isEqualTo(NEW_REFRESH_TOKEN);
        assertThat(response.user()).isNotNull();
        assertThat(response.user().email()).isEqualTo(TEST_EMAIL);
        assertThat(response.user().enabled()).isTrue();

        verify(tokenService).isTokenValid(OLD_REFRESH_TOKEN, TEST_EMAIL);
        verify(tokenService).generateAccessToken(userId.value(), TEST_EMAIL, "STUDENT", null);
        verify(tokenService).generateRefreshToken(userId.value(), TEST_EMAIL, "STUDENT", DEFAULT_REFRESH_EXPIRY_MS);
    }
}
