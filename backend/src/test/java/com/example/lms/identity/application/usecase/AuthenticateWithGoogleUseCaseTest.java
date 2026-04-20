package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.AuthResponse;
import com.example.lms.identity.application.dto.AuthenticateWithGoogleCommand;
import com.example.lms.identity.application.dto.VerifiedGoogleIdentity;
import com.example.lms.identity.application.port.GoogleIdentityVerifierPort;
import com.example.lms.identity.application.port.TokenService;
import com.example.lms.identity.domain.model.ExternalIdentityProvider;
import com.example.lms.identity.domain.model.Organization;
import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.model.UserExternalIdentity;
import com.example.lms.identity.domain.repository.ExternalIdentityRepository;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.domain.valueobject.UserId;
import com.example.lms.shared.exception.DomainException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthenticateWithGoogleUseCase Tests")
class AuthenticateWithGoogleUseCaseTest {

    private static final String ACCESS_TOKEN = "google_access_token";
    private static final String REFRESH_TOKEN = "google_refresh_token";

    @Mock
    private UserRepository userRepository;

    @Mock
    private ExternalIdentityRepository externalIdentityRepository;

    @Mock
    private GoogleIdentityVerifierPort googleIdentityVerifier;

    @Mock
    private TokenService tokenService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AcceptInviteUseCase acceptInviteUseCase;

    @Mock
    private OrganizationRepository organizationRepository;

    @InjectMocks
    private AuthenticateWithGoogleUseCase useCase;

    @Captor
    private ArgumentCaptor<User> userCaptor;

    @Test
    @DisplayName("Should authenticate an already linked Google account")
    void shouldAuthenticateLinkedGoogleAccount() {
        VerifiedGoogleIdentity googleIdentity = new VerifiedGoogleIdentity(
                "google-subject-123",
                "linked@example.com",
                true,
                "Linked User",
                "https://example.com/avatar.png"
        );
        User linkedUser = User.builder()
                .id(UserId.generate())
                .username("linked@example.com")
                .email(Email.of("linked@example.com"))
                .password("encoded")
                .fullName("Linked User")
                .role(Role.STUDENT)
                .enabled(true)
                .build();
        UserExternalIdentity linkedIdentity = UserExternalIdentity.linkGoogle(
                linkedUser.getId(),
                googleIdentity.subject(),
                googleIdentity.email(),
                Instant.now()
        );

        when(googleIdentityVerifier.verifyIdToken("id-token")).thenReturn(googleIdentity);
        when(externalIdentityRepository.findByProviderAndExternalSubject(
                ExternalIdentityProvider.GOOGLE, googleIdentity.subject()
        )).thenReturn(Optional.of(linkedIdentity));
        when(userRepository.findById(linkedUser.getId())).thenReturn(Optional.of(linkedUser));
        when(tokenService.generateAccessToken(any(UUID.class), anyString(), anyString(), nullable(UUID.class)))
                .thenReturn(ACCESS_TOKEN);
        when(tokenService.generateRefreshToken(any(UUID.class), anyString(), anyString(), anyLong()))
                .thenReturn(REFRESH_TOKEN);

        AuthResponse response = useCase.execute(new AuthenticateWithGoogleCommand("id-token", null));

        assertThat(response.accessToken()).isEqualTo(ACCESS_TOKEN);
        assertThat(response.refreshToken()).isEqualTo(REFRESH_TOKEN);
        assertThat(response.user().email()).isEqualTo("linked@example.com");

        verify(externalIdentityRepository).save(linkedIdentity);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should provision a new STUDENT account for first-time Google sign-in")
    void shouldProvisionNewStudentAccountForGoogleSignIn() {
        VerifiedGoogleIdentity googleIdentity = new VerifiedGoogleIdentity(
                "google-subject-456",
                "cadet@example.com",
                true,
                "Cadet User",
                "https://example.com/avatar.png"
        );
        UUID orgId = UUID.randomUUID();
        Organization defaultOrg = new Organization(
                orgId,
                "WIII",
                "WIII",
                "Default organization",
                true,
                30,
                Instant.now(),
                null
        );

        when(googleIdentityVerifier.verifyIdToken("id-token")).thenReturn(googleIdentity);
        when(externalIdentityRepository.findByProviderAndExternalSubject(
                ExternalIdentityProvider.GOOGLE, googleIdentity.subject()
        )).thenReturn(Optional.empty());
        when(userRepository.findByEmail("cadet@example.com")).thenReturn(Optional.empty());
        when(userRepository.existsByUsername("cadet@example.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded-google-only-password");
        when(organizationRepository.findByCode("WIII")).thenReturn(Optional.of(defaultOrg));
        when(organizationRepository.findById(orgId)).thenReturn(Optional.of(defaultOrg));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(tokenService.generateAccessToken(any(UUID.class), anyString(), anyString(), eq(orgId)))
                .thenReturn(ACCESS_TOKEN);
        when(tokenService.generateRefreshToken(any(UUID.class), anyString(), anyString(), anyLong()))
                .thenReturn(REFRESH_TOKEN);

        AuthResponse response = useCase.execute(new AuthenticateWithGoogleCommand("id-token", null));

        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();

        assertThat(savedUser.getRole()).isEqualTo(Role.STUDENT);
        assertThat(savedUser.getOrganizationId()).isEqualTo(orgId);
        assertThat(savedUser.getAvatarUrl()).isEqualTo("https://example.com/avatar.png");
        assertThat(response.user().role()).isEqualTo("STUDENT");
        verify(externalIdentityRepository).save(any(UserExternalIdentity.class));
    }

    @Test
    @DisplayName("Should reject Google sign-in when a local LMS account already uses the same email")
    void shouldRejectSilentLinkingWhenLocalAccountAlreadyExists() {
        VerifiedGoogleIdentity googleIdentity = new VerifiedGoogleIdentity(
                "google-subject-789",
                "existing@example.com",
                true,
                "Existing User",
                null
        );
        User existingUser = User.builder()
                .id(UserId.generate())
                .username("existing@example.com")
                .email(Email.of("existing@example.com"))
                .password("encoded")
                .fullName("Existing User")
                .role(Role.STUDENT)
                .enabled(true)
                .build();

        when(googleIdentityVerifier.verifyIdToken("id-token")).thenReturn(googleIdentity);
        when(externalIdentityRepository.findByProviderAndExternalSubject(
                ExternalIdentityProvider.GOOGLE, googleIdentity.subject()
        )).thenReturn(Optional.empty());
        when(userRepository.findByEmail("existing@example.com")).thenReturn(Optional.of(existingUser));

        assertThatThrownBy(() -> useCase.execute(new AuthenticateWithGoogleCommand("id-token", null)))
                .isInstanceOfSatisfying(DomainException.class, exception -> {
                    assertThat(exception.getErrorCode()).isEqualTo("ACCOUNT_LINK_REQUIRED");
                    assertThat(exception.getMessage()).contains("dang nhap bang mat khau");
                });

        verify(userRepository, never()).save(any(User.class));
        verify(externalIdentityRepository, never()).save(any(UserExternalIdentity.class));
    }

    @Test
    @DisplayName("Should attach a new Google account to the invited organization when invite code is present")
    void shouldAssignInvitedOrganizationForNewGoogleAccount() {
        VerifiedGoogleIdentity googleIdentity = new VerifiedGoogleIdentity(
                "google-subject-999",
                "invitee@example.com",
                true,
                "Invitee User",
                null
        );
        UUID invitedOrgId = UUID.randomUUID();
        Organization invitedOrg = new Organization(
                invitedOrgId,
                "Harbor Org",
                "HARBOR",
                "Invited organization",
                true,
                45,
                Instant.now(),
                null
        );

        when(googleIdentityVerifier.verifyIdToken("id-token")).thenReturn(googleIdentity);
        when(externalIdentityRepository.findByProviderAndExternalSubject(
                ExternalIdentityProvider.GOOGLE, googleIdentity.subject()
        )).thenReturn(Optional.empty());
        when(userRepository.findByEmail("invitee@example.com")).thenReturn(Optional.empty());
        when(userRepository.existsByUsername("invitee@example.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded-google-only-password");
        when(acceptInviteUseCase.acceptForNewUser("INVITE-2026")).thenReturn(invitedOrgId);
        when(organizationRepository.findById(invitedOrgId)).thenReturn(Optional.of(invitedOrg));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(tokenService.generateAccessToken(any(UUID.class), anyString(), anyString(), eq(invitedOrgId)))
                .thenReturn(ACCESS_TOKEN);
        when(tokenService.generateRefreshToken(any(UUID.class), anyString(), anyString(), anyLong()))
                .thenReturn(REFRESH_TOKEN);

        AuthResponse response = useCase.execute(new AuthenticateWithGoogleCommand("id-token", "INVITE-2026"));

        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();

        assertThat(savedUser.getRole()).isEqualTo(Role.STUDENT);
        assertThat(savedUser.getOrganizationId()).isEqualTo(invitedOrgId);
        assertThat(response.user().organizationId()).isEqualTo(invitedOrgId);
        verify(acceptInviteUseCase).acceptForNewUser("INVITE-2026");
        verify(organizationRepository, never()).findByCode("WIII");
    }
}
