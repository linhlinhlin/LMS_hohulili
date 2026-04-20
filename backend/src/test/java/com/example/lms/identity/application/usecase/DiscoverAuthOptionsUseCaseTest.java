package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.DiscoverAuthOptionsCommand;
import com.example.lms.identity.application.dto.DiscoverAuthOptionsResponse;
import com.example.lms.identity.domain.model.ExternalIdentityProvider;
import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.ExternalIdentityRepository;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.domain.valueobject.UserId;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
@DisplayName("DiscoverAuthOptionsUseCase Tests")
class DiscoverAuthOptionsUseCaseTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ExternalIdentityRepository externalIdentityRepository;

    @InjectMocks
    private DiscoverAuthOptionsUseCase useCase;

    @Test
    @DisplayName("returns register step when email does not exist")
    void returnsRegisterStepForUnknownEmail() {
        given(userRepository.findByEmail("new@maritime.edu")).willReturn(Optional.empty());

        DiscoverAuthOptionsResponse response = useCase.execute(new DiscoverAuthOptionsCommand("new@maritime.edu"));

        assertThat(response.accountExists()).isFalse();
        assertThat(response.nextStep()).isEqualTo("REGISTER");
        assertThat(response.passwordLoginAvailable()).isFalse();
        assertThat(response.googleSignInAvailable()).isFalse();
    }

    @Test
    @DisplayName("returns password step for local accounts")
    void returnsPasswordStepForLocalAccount() {
        User user = buildUser("teacher@maritime.edu", "Teacher Maritime");
        given(userRepository.findByEmail("teacher@maritime.edu")).willReturn(Optional.of(user));
        given(externalIdentityRepository.existsByUserIdAndProvider(user.getId(), ExternalIdentityProvider.GOOGLE))
                .willReturn(false);

        DiscoverAuthOptionsResponse response = useCase.execute(new DiscoverAuthOptionsCommand("teacher@maritime.edu"));

        assertThat(response.accountExists()).isTrue();
        assertThat(response.nextStep()).isEqualTo("PASSWORD");
        assertThat(response.passwordLoginAvailable()).isTrue();
        assertThat(response.googleSignInAvailable()).isFalse();
    }

    @Test
    @DisplayName("returns google step for Google-linked accounts")
    void returnsGoogleStepForGoogleLinkedAccount() {
        User user = buildUser("student@maritime.edu", "Student Maritime");
        given(userRepository.findByEmail("student@maritime.edu")).willReturn(Optional.of(user));
        given(externalIdentityRepository.existsByUserIdAndProvider(user.getId(), ExternalIdentityProvider.GOOGLE))
                .willReturn(true);

        DiscoverAuthOptionsResponse response = useCase.execute(new DiscoverAuthOptionsCommand("student@maritime.edu"));

        assertThat(response.accountExists()).isTrue();
        assertThat(response.nextStep()).isEqualTo("GOOGLE");
        assertThat(response.passwordLoginAvailable()).isFalse();
        assertThat(response.googleSignInAvailable()).isTrue();
    }

    private User buildUser(String email, String fullName) {
        return User.builder()
                .id(UserId.of(UUID.randomUUID()))
                .username(email)
                .email(Email.of(email))
                .password("$2a$10$placeholder")
                .fullName(fullName)
                .role(Role.STUDENT)
                .enabled(true)
                .createdAt(Instant.now())
                .build();
    }
}
