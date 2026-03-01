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
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for RegisterUserUseCaseV2.
 *
 * Tests business logic for user registration including:
 * - P0-1: Role forced to STUDENT on public registration (privilege escalation prevention)
 * - P0-2: PasswordPolicy validation before encoding
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

    @Mock
    private AcceptInviteUseCase acceptInviteUseCase;

    @Mock
    private com.example.lms.identity.domain.repository.OrganizationRepository organizationRepository;

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
            "STUDENT",
            null
        );
    }

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Đăng ký thành công với command hợp lệ")
        void shouldRegisterUserSuccessfully() {
            // Given
            when(userRepository.existsByUsername(anyString())).thenReturn(false);
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn(ENCODED_PASSWORD);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(tokenService.generateAccessToken(any(UUID.class), anyString(), anyString(), any())).thenReturn(ACCESS_TOKEN);
            when(tokenService.generateRefreshToken(any(UUID.class), anyString(), anyString(), anyLong())).thenReturn(REFRESH_TOKEN);

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
        @DisplayName("Lưu user với mật khẩu đã mã hóa")
        void shouldSaveUserWithEncodedPassword() {
            // Given
            when(userRepository.existsByUsername(anyString())).thenReturn(false);
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode("Password123!")).thenReturn(ENCODED_PASSWORD);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(tokenService.generateAccessToken(any(UUID.class), anyString(), anyString(), any())).thenReturn(ACCESS_TOKEN);
            when(tokenService.generateRefreshToken(any(UUID.class), anyString(), anyString(), anyLong())).thenReturn(REFRESH_TOKEN);

            // When
            useCase.execute(validCommand);

            // Then
            verify(userRepository).save(userCaptor.capture());
            User savedUser = userCaptor.getValue();
            assertThat(savedUser.getPassword())
                    .as("Mật khẩu phải được mã hóa trước khi lưu")
                    .isEqualTo(ENCODED_PASSWORD);
        }

        @Test
        @DisplayName("Phát hành UserRegisteredEvent sau khi đăng ký thành công")
        void shouldPublishUserRegisteredEvent() {
            // Given
            when(userRepository.existsByUsername(anyString())).thenReturn(false);
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn(ENCODED_PASSWORD);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(tokenService.generateAccessToken(any(UUID.class), anyString(), anyString(), any())).thenReturn(ACCESS_TOKEN);
            when(tokenService.generateRefreshToken(any(UUID.class), anyString(), anyString(), anyLong())).thenReturn(REFRESH_TOKEN);

            // When
            useCase.execute(validCommand);

            // Then
            verify(eventPublisher).publish(any());
        }
    }

    @Nested
    @DisplayName("P0-1: Ép vai trò STUDENT cho đăng ký công khai")
    class ForceStudentRoleTests {

        @Test
        @DisplayName("P0-1: Phải ép vai trò STUDENT khi yêu cầu đăng ký với ADMIN")
        void shouldForceStudentRole_whenAdminRoleRequested() {
            // Given
            RegisterUserCommand adminCommand = new RegisterUserCommand(
                    "hacker", "hacker@test.com", "securePass99", "Hacker User", "ADMIN", null
            );

            when(userRepository.existsByUsername("hacker")).thenReturn(false);
            when(userRepository.existsByEmail("hacker@test.com")).thenReturn(false);
            when(passwordEncoder.encode("securePass99")).thenReturn("encoded-pw");

            User savedUser = User.createNew(
                    "hacker", Email.of("hacker@test.com"), "encoded-pw", "Hacker User", Role.STUDENT
            );
            when(userRepository.save(any(User.class))).thenReturn(savedUser);
            when(tokenService.generateAccessToken(any(), anyString(), anyString(), any())).thenReturn("token");
            when(tokenService.generateRefreshToken(any(), anyString(), anyString(), anyLong())).thenReturn("token");

            // When
            AuthResponse response = useCase.execute(adminCommand);

            // Then
            verify(userRepository).save(userCaptor.capture());
            assertThat(userCaptor.getValue().getRole())
                    .as("Vai trò phải luôn là STUDENT cho đăng ký công khai, bất kể yêu cầu ADMIN")
                    .isEqualTo(Role.STUDENT);
            assertThat(response.user().role())
                    .as("Vai trò trong phản hồi phải là STUDENT")
                    .isEqualTo("STUDENT");
        }

        @Test
        @DisplayName("P0-1: Phải ép vai trò STUDENT khi yêu cầu đăng ký với ORG_ADMIN")
        void shouldForceStudentRole_whenOrgAdminRoleRequested() {
            // Given
            RegisterUserCommand orgAdminCommand = new RegisterUserCommand(
                    "orguser", "orguser@test.com", "securePass99", "Org Admin User", "ORG_ADMIN", null
            );

            when(userRepository.existsByUsername("orguser")).thenReturn(false);
            when(userRepository.existsByEmail("orguser@test.com")).thenReturn(false);
            when(passwordEncoder.encode("securePass99")).thenReturn("encoded-pw");

            User savedUser = User.createNew(
                    "orguser", Email.of("orguser@test.com"), "encoded-pw", "Org Admin User", Role.STUDENT
            );
            when(userRepository.save(any(User.class))).thenReturn(savedUser);
            when(tokenService.generateAccessToken(any(), anyString(), anyString(), any())).thenReturn("token");
            when(tokenService.generateRefreshToken(any(), anyString(), anyString(), anyLong())).thenReturn("token");

            // When
            AuthResponse response = useCase.execute(orgAdminCommand);

            // Then
            verify(userRepository).save(userCaptor.capture());
            assertThat(userCaptor.getValue().getRole())
                    .as("Vai trò phải luôn là STUDENT cho đăng ký công khai, bất kể yêu cầu ORG_ADMIN")
                    .isEqualTo(Role.STUDENT);
            assertThat(response.user().role())
                    .as("Vai trò trong phản hồi phải là STUDENT")
                    .isEqualTo("STUDENT");
        }

        @Test
        @DisplayName("P0-1: Phải mặc định vai trò STUDENT khi không truyền vai trò")
        void shouldDefaultToStudentRole_whenNoRoleProvided() {
            // Given
            RegisterUserCommand nullRoleCommand = new RegisterUserCommand(
                    "newuser", "newuser@test.com", "securePass99", "New User", null, null
            );

            when(userRepository.existsByUsername("newuser")).thenReturn(false);
            when(userRepository.existsByEmail("newuser@test.com")).thenReturn(false);
            when(passwordEncoder.encode("securePass99")).thenReturn("encoded-pw");

            User savedUser = User.createNew(
                    "newuser", Email.of("newuser@test.com"), "encoded-pw", "New User", Role.STUDENT
            );
            when(userRepository.save(any(User.class))).thenReturn(savedUser);
            when(tokenService.generateAccessToken(any(), anyString(), anyString(), any())).thenReturn("token");
            when(tokenService.generateRefreshToken(any(), anyString(), anyString(), anyLong())).thenReturn("token");

            // When
            AuthResponse response = useCase.execute(nullRoleCommand);

            // Then
            verify(userRepository).save(userCaptor.capture());
            assertThat(userCaptor.getValue().getRole())
                    .as("Vai trò phải mặc định là STUDENT khi không được chỉ định")
                    .isEqualTo(Role.STUDENT);
            assertThat(response.user().role())
                    .as("Vai trò trong phản hồi phải là STUDENT")
                    .isEqualTo("STUDENT");
        }
    }

    @Nested
    @DisplayName("P0-2: Kiểm tra PasswordPolicy")
    class PasswordPolicyTests {

        @Test
        @DisplayName("P0-2: Phải từ chối mật khẩu phổ biến theo PasswordPolicy")
        void shouldRejectCommonPassword() {
            // Given
            RegisterUserCommand weakPasswordCommand = new RegisterUserCommand(
                    "testuser", "testuser@test.com", "password", "Test User", null, null
            );

            when(userRepository.existsByUsername("testuser")).thenReturn(false);
            when(userRepository.existsByEmail("testuser@test.com")).thenReturn(false);

            // When / Then
            assertThatThrownBy(() -> useCase.execute(weakPasswordCommand))
                    .as("Phải ném ValidationException khi mật khẩu nằm trong danh sách phổ biến")
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("Mật khẩu quá phổ biến");

            verify(passwordEncoder, never()).encode(anyString());
            verify(userRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Validation Error Tests")
    class ValidationErrorTests {

        @Test
        @DisplayName("Phải ném ValidationException khi username đã tồn tại")
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
        @DisplayName("Phải ném ValidationException khi email đã tồn tại")
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
    }

    @Nested
    @DisplayName("Integration with Dependencies")
    class DependencyIntegrationTests {

        @Test
        @DisplayName("Phải gọi passwordEncoder.encode với mật khẩu thô")
        void shouldEncodePassword() {
            // Given
            when(userRepository.existsByUsername(anyString())).thenReturn(false);
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode("Password123!")).thenReturn(ENCODED_PASSWORD);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(tokenService.generateAccessToken(any(UUID.class), anyString(), anyString(), any())).thenReturn(ACCESS_TOKEN);
            when(tokenService.generateRefreshToken(any(UUID.class), anyString(), anyString(), anyLong())).thenReturn(REFRESH_TOKEN);

            // When
            useCase.execute(validCommand);

            // Then
            verify(passwordEncoder).encode("Password123!");
        }

        @Test
        @DisplayName("Phải gọi tokenService với thông tin user đã lưu")
        void shouldGenerateTokensForSavedUser() {
            // Given
            when(userRepository.existsByUsername(anyString())).thenReturn(false);
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn(ENCODED_PASSWORD);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(tokenService.generateAccessToken(any(UUID.class), anyString(), anyString(), any())).thenReturn(ACCESS_TOKEN);
            when(tokenService.generateRefreshToken(any(UUID.class), anyString(), anyString(), anyLong())).thenReturn(REFRESH_TOKEN);

            // When
            useCase.execute(validCommand);

            // Then
            verify(tokenService).generateAccessToken(any(UUID.class), eq("test@example.com"), eq("STUDENT"), any());
            verify(tokenService).generateRefreshToken(any(UUID.class), eq("test@example.com"), eq("STUDENT"), anyLong());
        }
    }
}
