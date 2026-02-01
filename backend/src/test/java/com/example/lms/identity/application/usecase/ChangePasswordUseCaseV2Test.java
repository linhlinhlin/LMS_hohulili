package com.example.lms.identity.application.usecase;

import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.domain.valueobject.UserId;
import com.example.lms.shared.exception.EntityNotFoundException;
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

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ChangePasswordUseCaseV2.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ChangePasswordUseCaseV2 Tests")
class ChangePasswordUseCaseV2Test {

    @Mock
    private UserRepository userRepository;
    
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private ChangePasswordUseCaseV2 useCase;

    @Captor
    private ArgumentCaptor<User> userCaptor;

    private User validUser;
    private UUID userId;
    private static final String CURRENT_PASSWORD = "CurrentPassword123!";
    private static final String NEW_PASSWORD = "NewPassword456!";
    private static final String ENCODED_CURRENT = "encoded_current";
    private static final String ENCODED_NEW = "encoded_new";

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        validUser = User.builder()
            .id(UserId.of(userId))
            .username("testuser")
            .email(Email.of("test@example.com"))
            .password(ENCODED_CURRENT)
            .fullName("Test User")
            .role(Role.STUDENT)
            .enabled(true)
            .build();
    }

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should change password successfully")
        void shouldChangePasswordSuccessfully() {
            // Given
            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.of(validUser));
            when(passwordEncoder.matches(CURRENT_PASSWORD, ENCODED_CURRENT)).thenReturn(true);
            when(passwordEncoder.encode(NEW_PASSWORD)).thenReturn(ENCODED_NEW);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

            // When
            useCase.execute(userId, CURRENT_PASSWORD, NEW_PASSWORD);

            // Then
            verify(userRepository).save(userCaptor.capture());
            User savedUser = userCaptor.getValue();
            assertThat(savedUser.getPassword()).isEqualTo(ENCODED_NEW);
        }

        @Test
        @DisplayName("Should encode new password before saving")
        void shouldEncodeNewPassword() {
            // Given
            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.of(validUser));
            when(passwordEncoder.matches(CURRENT_PASSWORD, ENCODED_CURRENT)).thenReturn(true);
            when(passwordEncoder.encode(NEW_PASSWORD)).thenReturn(ENCODED_NEW);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

            // When
            useCase.execute(userId, CURRENT_PASSWORD, NEW_PASSWORD);

            // Then
            verify(passwordEncoder).encode(NEW_PASSWORD);
        }
    }

    @Nested
    @DisplayName("Error Handling Tests")
    class ErrorHandlingTests {

        @Test
        @DisplayName("Should throw when user not found")
        void shouldThrowWhenUserNotFound() {
            // Given
            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> useCase.execute(userId, CURRENT_PASSWORD, NEW_PASSWORD))
                .isInstanceOf(EntityNotFoundException.class);

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw when current password is incorrect")
        void shouldThrowWhenCurrentPasswordIncorrect() {
            // Given
            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.of(validUser));
            when(passwordEncoder.matches(CURRENT_PASSWORD, ENCODED_CURRENT)).thenReturn(false);

            // When/Then
            assertThatThrownBy(() -> useCase.execute(userId, CURRENT_PASSWORD, NEW_PASSWORD))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("Mật khẩu hiện tại không đúng");

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw when new password is too short")
        void shouldThrowWhenNewPasswordTooShort() {
            // Given
            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.of(validUser));
            when(passwordEncoder.matches(CURRENT_PASSWORD, ENCODED_CURRENT)).thenReturn(true);

            // When/Then
            assertThatThrownBy(() -> useCase.execute(userId, CURRENT_PASSWORD, "12345"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("Mật khẩu mới phải có ít nhất 6 ký tự");

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw when new password is null")
        void shouldThrowWhenNewPasswordNull() {
            // Given
            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.of(validUser));
            when(passwordEncoder.matches(CURRENT_PASSWORD, ENCODED_CURRENT)).thenReturn(true);

            // When/Then
            assertThatThrownBy(() -> useCase.execute(userId, CURRENT_PASSWORD, null))
                .isInstanceOf(ValidationException.class);

            verify(userRepository, never()).save(any());
        }
    }
}
