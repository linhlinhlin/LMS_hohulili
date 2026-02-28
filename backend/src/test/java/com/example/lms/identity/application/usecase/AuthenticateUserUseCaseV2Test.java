package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.AuthResponse;
import com.example.lms.identity.application.dto.AuthenticateCommand;
import com.example.lms.identity.application.port.TokenService;
import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.domain.valueobject.UserId;
import com.example.lms.shared.exception.UnauthorizedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AuthenticateUserUseCaseV2.
 *
 * Tests business logic for user authentication including:
 * - Successful login flow
 * - Invalid credentials handling
 * - Disabled account handling
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AuthenticateUserUseCaseV2 Tests")
class AuthenticateUserUseCaseV2Test {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TokenService tokenService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthenticateUserUseCaseV2 useCase;

    private User validUser;
    private AuthenticateCommand validCommand;
    private static final String ACCESS_TOKEN = "access_token_123";
    private static final String REFRESH_TOKEN = "refresh_token_456";
    private static final String RAW_PASSWORD = "Password123!";
    private static final String ENCODED_PASSWORD = "encoded_password";

    @BeforeEach
    void setUp() {
        validUser = User.builder()
            .id(UserId.generate())
            .username("testuser")
            .email(Email.of("test@example.com"))
            .password(ENCODED_PASSWORD)
            .fullName("Test User")
            .role(Role.STUDENT)
            .enabled(true)
            .build();

        validCommand = new AuthenticateCommand("test@example.com", RAW_PASSWORD);
    }

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should authenticate user successfully with valid email and password")
        void shouldAuthenticateWithValidEmailAndPassword() {
            // Given
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(validUser));
            when(passwordEncoder.matches(RAW_PASSWORD, ENCODED_PASSWORD)).thenReturn(true);
            when(tokenService.generateAccessToken(any(UUID.class), anyString(), anyString())).thenReturn(ACCESS_TOKEN);
            when(tokenService.generateRefreshToken(any(UUID.class), anyString(), anyString())).thenReturn(REFRESH_TOKEN);

            // When
            AuthResponse response = useCase.execute(validCommand);

            // Then
            assertThat(response).isNotNull();
            assertThat(response.accessToken()).isEqualTo(ACCESS_TOKEN);
            assertThat(response.refreshToken()).isEqualTo(REFRESH_TOKEN);
            assertThat(response.user()).isNotNull();
            assertThat(response.user().username()).isEqualTo("testuser");
        }

        @Test
        @DisplayName("Should authenticate user with username if email not found")
        void shouldAuthenticateWithUsername() {
            // Given
            when(userRepository.findByEmail("testuser")).thenReturn(Optional.empty());
            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(validUser));
            when(passwordEncoder.matches(RAW_PASSWORD, ENCODED_PASSWORD)).thenReturn(true);
            when(tokenService.generateAccessToken(any(UUID.class), anyString(), anyString())).thenReturn(ACCESS_TOKEN);
            when(tokenService.generateRefreshToken(any(UUID.class), anyString(), anyString())).thenReturn(REFRESH_TOKEN);

            AuthenticateCommand usernameCommand = new AuthenticateCommand("testuser", RAW_PASSWORD);

            // When
            AuthResponse response = useCase.execute(usernameCommand);

            // Then
            assertThat(response).isNotNull();
            assertThat(response.accessToken()).isEqualTo(ACCESS_TOKEN);
        }

        @Test
        @DisplayName("Should return user information in response")
        void shouldReturnUserInfoInResponse() {
            // Given
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(validUser));
            when(passwordEncoder.matches(RAW_PASSWORD, ENCODED_PASSWORD)).thenReturn(true);
            when(tokenService.generateAccessToken(any(UUID.class), anyString(), anyString())).thenReturn(ACCESS_TOKEN);
            when(tokenService.generateRefreshToken(any(UUID.class), anyString(), anyString())).thenReturn(REFRESH_TOKEN);

            // When
            AuthResponse response = useCase.execute(validCommand);

            // Then
            assertThat(response.user()).isNotNull();
            assertThat(response.user().email()).isEqualTo("test@example.com");
            assertThat(response.user().fullName()).isEqualTo("Test User");
        }
    }

    @Nested
    @DisplayName("Error Handling Tests")
    class ErrorHandlingTests {

        @Test
        @DisplayName("Should throw UnauthorizedException when user not found")
        void shouldThrowWhenUserNotFound() {
            // Given
            when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
            when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> useCase.execute(validCommand))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Thông tin đăng nhập không chính xác");

            verify(passwordEncoder, never()).matches(anyString(), anyString());
            verify(tokenService, never()).generateAccessToken(any(), anyString(), anyString());
        }

        @Test
        @DisplayName("Should throw UnauthorizedException when password is incorrect")
        void shouldThrowWhenPasswordIncorrect() {
            // Given
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(validUser));
            when(passwordEncoder.matches(RAW_PASSWORD, ENCODED_PASSWORD)).thenReturn(false);

            // When/Then
            assertThatThrownBy(() -> useCase.execute(validCommand))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Thông tin đăng nhập không chính xác");

            verify(tokenService, never()).generateAccessToken(any(), anyString(), anyString());
        }

        @Test
        @DisplayName("Should throw UnauthorizedException when account is disabled")
        void shouldThrowWhenAccountDisabled() {
            // Given
            User disabledUser = User.builder()
                .id(UserId.generate())
                .username("disableduser")
                .email(Email.of("disabled@example.com"))
                .password(ENCODED_PASSWORD)
                .fullName("Disabled User")
                .role(Role.STUDENT)
                .enabled(false)
                .build();

            when(userRepository.findByEmail("disabled@example.com")).thenReturn(Optional.of(disabledUser));

            AuthenticateCommand disabledCommand = new AuthenticateCommand("disabled@example.com", RAW_PASSWORD);

            // When/Then
            assertThatThrownBy(() -> useCase.execute(disabledCommand))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Tài khoản đã bị vô hiệu hóa");

            verify(passwordEncoder, never()).matches(anyString(), anyString());
        }
    }

    @Nested
    @DisplayName("Token Generation Tests")
    class TokenGenerationTests {

        @Test
        @DisplayName("Should generate both access and refresh tokens via TokenService port")
        void shouldGenerateBothTokens() {
            // Given
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(validUser));
            when(passwordEncoder.matches(RAW_PASSWORD, ENCODED_PASSWORD)).thenReturn(true);
            when(tokenService.generateAccessToken(any(UUID.class), anyString(), anyString())).thenReturn(ACCESS_TOKEN);
            when(tokenService.generateRefreshToken(any(UUID.class), anyString(), anyString())).thenReturn(REFRESH_TOKEN);

            // When
            useCase.execute(validCommand);

            // Then
            verify(tokenService).generateAccessToken(any(UUID.class), eq("test@example.com"), eq("STUDENT"));
            verify(tokenService).generateRefreshToken(any(UUID.class), eq("test@example.com"), eq("STUDENT"));
        }
    }
}
