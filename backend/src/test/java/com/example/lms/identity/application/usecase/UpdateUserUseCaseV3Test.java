package com.example.lms.identity.application.usecase;

import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.domain.valueobject.UserId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UpdateUserUseCaseV3.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UpdateUserUseCaseV3 Tests")
class UpdateUserUseCaseV3Test {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UpdateUserUseCaseV3 useCase;

    private UUID userId;
    private User existingUser;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        existingUser = User.builder()
            .id(UserId.of(userId))
            .username("john.doe")
            .email(Email.of("john@maritime.edu"))
            .password("encoded-password")
            .fullName("John Doe")
            .role(Role.STUDENT)
            .enabled(true)
            .build();
    }

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should update full name")
        void shouldUpdateFullName() {
            // Given
            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.of(existingUser));
            when(userRepository.save(any(User.class))).thenReturn(existingUser);

            UpdateUserUseCaseV3.Command command = new UpdateUserUseCaseV3.Command("Jane Doe", null, null);

            // When
            Optional<User> result = useCase.execute(userId, command);

            // Then
            assertThat(result).isPresent();
            assertThat(existingUser.getFullName()).isEqualTo("Jane Doe");
            verify(userRepository).save(existingUser);
        }

        @Test
        @DisplayName("Should change role")
        void shouldChangeRole() {
            // Given
            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.of(existingUser));
            when(userRepository.save(any(User.class))).thenReturn(existingUser);

            UpdateUserUseCaseV3.Command command = new UpdateUserUseCaseV3.Command(null, "TEACHER", null);

            // When
            useCase.execute(userId, command);

            // Then
            assertThat(existingUser.getRole()).isEqualTo(Role.TEACHER);
        }

        @Test
        @DisplayName("Should toggle enabled status")
        void shouldToggleEnabledStatus() {
            // Given
            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.of(existingUser));
            when(userRepository.save(any(User.class))).thenReturn(existingUser);

            UpdateUserUseCaseV3.Command command = new UpdateUserUseCaseV3.Command(null, null, false);

            // When
            useCase.execute(userId, command);

            // Then
            assertThat(existingUser.isEnabled()).isFalse();
        }
    }

    @Nested
    @DisplayName("Error Tests")
    class ErrorTests {

        @Test
        @DisplayName("Should return empty when user not found")
        void shouldReturnEmptyWhenUserNotFound() {
            // Given
            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.empty());

            UpdateUserUseCaseV3.Command command = new UpdateUserUseCaseV3.Command("Name", null, null);

            // When
            Optional<User> result = useCase.execute(userId, command);

            // Then
            assertThat(result).isEmpty();
            verify(userRepository, never()).save(any());
        }
    }
}
