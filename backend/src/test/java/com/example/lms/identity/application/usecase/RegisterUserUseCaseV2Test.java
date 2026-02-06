package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.AuthResponse;
import com.example.lms.identity.application.dto.RegisterUserCommand;
import com.example.lms.identity.application.port.TokenService;
import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.domain.event.DomainEventPublisher;
import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.exception.ValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for RegisterUserUseCaseV2.
 *
 * Tests business logic for user registration including:
 * - Successful registration flow
 * - Validation error handling
 * - Domain event publishing
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("RegisterUserUseCaseV2 Tests")
class RegisterUserUseCaseV2Test {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TokenService tokenService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private DomainEventPublisher eventPublisher;

    @InjectMocks
    private RegisterUserUseCaseV2 useCase;

    @Captor
    private ArgumentCaptor<User> userCaptor;

    private RegisterUserCommand validCommand;
    private static final String ENCODED_PASSWORD = "encoded_password";
    private static final String ACCESS_TOKEN = "access_token_123";
    private static final String REFRESH_TOKEN = "refresh_token_456";

    @BeforeEach
    void setUp() {
        validCommand = new RegisterUserCommand(
            "testuser",
            "test@example.com",
            "Password123!",
            "Test User",
            "STUDENT"
        );
    }

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should register user successfully with valid command")
        void shouldRegisterUserSuccessfully() {
            // Given
            when(userRepository.existsByUsername(anyString())).thenReturn(false);
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn(ENCODED_PASSWORD);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
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
        @DisplayName("Should save user with encoded password")
        void shouldSaveUserWithEncodedPassword() {
            // Given
            when(userRepository.existsByUsername(anyString())).thenReturn(false);
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode("Password123!")).thenReturn(ENCODED_PASSWORD);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(tokenService.generateAccessToken(any(UUID.class), anyString(), anyString())).thenReturn(ACCESS_TOKEN);
            when(tokenService.generateRefreshToken(any(UUID.class), anyString(), anyString())).thenReturn(REFRESH_TOKEN);

            // When
            useCase.execute(validCommand);

            // Then
            verify(userRepository).save(userCaptor.capture());
            User savedUser = userCaptor.getValue();
            assertThat(savedUser.getPassword()).isEqualTo(ENCODED_PASSWORD);
        }

        @Test
        @DisplayName("Should publish UserRegisteredEvent after successful registration")
        void shouldPublishUserRegisteredEvent() {
            // Given
            when(userRepository.existsByUsername(anyString())).thenReturn(false);
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn(ENCODED_PASSWORD);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(tokenService.generateAccessToken(any(UUID.class), anyString(), anyString())).thenReturn(ACCESS_TOKEN);
            when(tokenService.generateRefreshToken(any(UUID.class), anyString(), anyString())).thenReturn(REFRESH_TOKEN);

            // When
            useCase.execute(validCommand);

            // Then
            verify(eventPublisher).publish(any());
        }

        @Test
        @DisplayName("Should assign STUDENT role by default when role is null")
        void shouldAssignStudentRoleByDefault() {
            // Given
            RegisterUserCommand commandWithoutRole = new RegisterUserCommand(
                "testuser", "test@example.com", "Password123!", "Test User", null
            );
            when(userRepository.existsByUsername(anyString())).thenReturn(false);
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn(ENCODED_PASSWORD);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(tokenService.generateAccessToken(any(UUID.class), anyString(), anyString())).thenReturn(ACCESS_TOKEN);
            when(tokenService.generateRefreshToken(any(UUID.class), anyString(), anyString())).thenReturn(REFRESH_TOKEN);

            // When
            useCase.execute(commandWithoutRole);

            // Then
            verify(userRepository).save(userCaptor.capture());
            User savedUser = userCaptor.getValue();
            assertThat(savedUser.getRole()).isEqualTo(Role.STUDENT);
        }

        @Test
        @DisplayName("Should accept TEACHER role when specified")
        void shouldAcceptTeacherRole() {
            // Given
            RegisterUserCommand teacherCommand = new RegisterUserCommand(
                "testteacher", "teacher@example.com", "Password123!", "Test Teacher", "TEACHER"
            );
            when(userRepository.existsByUsername(anyString())).thenReturn(false);
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn(ENCODED_PASSWORD);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(tokenService.generateAccessToken(any(UUID.class), anyString(), anyString())).thenReturn(ACCESS_TOKEN);
            when(tokenService.generateRefreshToken(any(UUID.class), anyString(), anyString())).thenReturn(REFRESH_TOKEN);

            // When
            useCase.execute(teacherCommand);

            // Then
            verify(userRepository).save(userCaptor.capture());
            User savedUser = userCaptor.getValue();
            assertThat(savedUser.getRole()).isEqualTo(Role.TEACHER);
        }
    }

    @Nested
    @DisplayName("Validation Error Tests")
    class ValidationErrorTests {

        @Test
        @DisplayName("Should throw ValidationException when username already exists")
        void shouldThrowWhenUsernameExists() {
            // Given
            when(userRepository.existsByUsername("testuser")).thenReturn(true);

            // When/Then
            assertThatThrownBy(() -> useCase.execute(validCommand))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("Username đã tồn tại");

            verify(userRepository, never()).save(any());
            verify(eventPublisher, never()).publish(any());
        }

        @Test
        @DisplayName("Should throw ValidationException when email already exists")
        void shouldThrowWhenEmailExists() {
            // Given
            when(userRepository.existsByUsername(anyString())).thenReturn(false);
            when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

            // When/Then
            assertThatThrownBy(() -> useCase.execute(validCommand))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("Email đã tồn tại");

            verify(userRepository, never()).save(any());
            verify(eventPublisher, never()).publish(any());
        }

        @Test
        @DisplayName("Should throw ValidationException when role is invalid")
        void shouldThrowWhenRoleIsInvalid() {
            // Given
            RegisterUserCommand invalidRoleCommand = new RegisterUserCommand(
                "testuser", "test@example.com", "Password123!", "Test User", "INVALID_ROLE"
            );
            when(userRepository.existsByUsername(anyString())).thenReturn(false);
            when(userRepository.existsByEmail(anyString())).thenReturn(false);

            // When/Then
            assertThatThrownBy(() -> useCase.execute(invalidRoleCommand))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("Role không hợp lệ");

            verify(userRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Integration with Dependencies")
    class DependencyIntegrationTests {

        @Test
        @DisplayName("Should call passwordEncoder.encode with raw password")
        void shouldEncodePassword() {
            // Given
            when(userRepository.existsByUsername(anyString())).thenReturn(false);
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode("Password123!")).thenReturn(ENCODED_PASSWORD);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(tokenService.generateAccessToken(any(UUID.class), anyString(), anyString())).thenReturn(ACCESS_TOKEN);
            when(tokenService.generateRefreshToken(any(UUID.class), anyString(), anyString())).thenReturn(REFRESH_TOKEN);

            // When
            useCase.execute(validCommand);

            // Then
            verify(passwordEncoder).encode("Password123!");
        }

        @Test
        @DisplayName("Should call tokenService with user details")
        void shouldGenerateTokensForSavedUser() {
            // Given
            when(userRepository.existsByUsername(anyString())).thenReturn(false);
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn(ENCODED_PASSWORD);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
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
