package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.UserResponse;
import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.domain.valueobject.UserId;
import com.example.lms.shared.exception.EntityNotFoundException;
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
 * Unit tests for GetCurrentUserUseCaseV2.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("GetCurrentUserUseCaseV2 Tests")
class GetCurrentUserUseCaseV2Test {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private GetCurrentUserUseCaseV2 useCase;

    private User validUser;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        validUser = User.builder()
            .id(UserId.of(userId))
            .username("testuser")
            .email(Email.of("test@example.com"))
            .password("encoded_password")
            .fullName("Test User")
            .role(Role.STUDENT)
            .enabled(true)
            .build();
    }

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should return user when found")
        void shouldReturnUserWhenFound() {
            // Given
            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.of(validUser));

            // When
            UserResponse response = useCase.execute(userId);

            // Then
            assertThat(response).isNotNull();
            assertThat(response.username()).isEqualTo("testuser");
            assertThat(response.email()).isEqualTo("test@example.com");
            assertThat(response.fullName()).isEqualTo("Test User");
        }

        @Test
        @DisplayName("Should call repository with correct userId")
        void shouldCallRepositoryWithCorrectUserId() {
            // Given
            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.of(validUser));

            // When
            useCase.execute(userId);

            // Then
            verify(userRepository).findById(UserId.of(userId));
        }
    }

    @Nested
    @DisplayName("Error Handling Tests")
    class ErrorHandlingTests {

        @Test
        @DisplayName("Should throw EntityNotFoundException when user not found")
        void shouldThrowWhenUserNotFound() {
            // Given
            when(userRepository.findById(any(UserId.class))).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> useCase.execute(userId))
                .isInstanceOf(EntityNotFoundException.class);
        }
    }
}
