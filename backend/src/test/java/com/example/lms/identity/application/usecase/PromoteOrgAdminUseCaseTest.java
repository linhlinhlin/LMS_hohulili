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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Issue #258 (Phase 4 PR 3): Promote/demote ORG_ADMIN workflow tests.
 * Sử dụng domain UserRepository + User domain model (clean architecture).
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("PromoteOrgAdminUseCase Tests")
class PromoteOrgAdminUseCaseTest {

    @Mock
    private UserRepository userRepo;

    @InjectMocks
    private PromoteOrgAdminUseCase useCase;

    @Captor
    private ArgumentCaptor<User> userCaptor;

    private UUID orgId;
    private UUID userIdRaw;
    private UserId userId;
    private UUID actorId;

    @BeforeEach
    void setUp() {
        orgId = UUID.randomUUID();
        userIdRaw = UUID.randomUUID();
        userId = UserId.of(userIdRaw);
        actorId = UUID.randomUUID();
    }

    private User memberWithRole(Role role) {
        User user = User.builder()
                .id(userId)
                .username("testuser")
                .email(Email.of("test@example.com"))
                .password("encoded")
                .fullName("Test User")
                .role(role)
                .enabled(true)
                .organizationId(orgId)
                .build();
        return user;
    }

    @Test
    @DisplayName("Promote STUDENT → ORG_ADMIN")
    void shouldPromoteStudentToOrgAdmin() {
        User user = memberWithRole(Role.STUDENT);
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));
        when(userRepo.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        useCase.promote(orgId, userIdRaw, actorId);

        verify(userRepo).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getRole()).isEqualTo(Role.ORG_ADMIN);
    }

    @Test
    @DisplayName("Promote TEACHER → ORG_ADMIN")
    void shouldPromoteTeacherToOrgAdmin() {
        User user = memberWithRole(Role.TEACHER);
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));
        when(userRepo.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        useCase.promote(orgId, userIdRaw, actorId);

        verify(userRepo).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getRole()).isEqualTo(Role.ORG_ADMIN);
    }

    @Test
    @DisplayName("Promote user role=ADMIN → ValidationException (system role bảo toàn)")
    void shouldRejectPromotingSystemAdmin() {
        User user = memberWithRole(Role.ADMIN);
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> useCase.promote(orgId, userIdRaw, actorId))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("ADMIN");

        verify(userRepo, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Promote user not in org → EntityNotFoundException")
    void shouldRejectPromotingNonMember() {
        User user = User.builder()
                .id(userId)
                .username("testuser")
                .email(Email.of("test@example.com"))
                .password("encoded")
                .fullName("Test User")
                .role(Role.STUDENT)
                .enabled(true)
                .organizationId(UUID.randomUUID()) // different org
                .build();
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> useCase.promote(orgId, userIdRaw, actorId))
                .isInstanceOf(EntityNotFoundException.class);

        verify(userRepo, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Promote already ORG_ADMIN → idempotent no-op")
    void shouldBeIdempotentPromote() {
        User user = memberWithRole(Role.ORG_ADMIN);
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));

        useCase.promote(orgId, userIdRaw, actorId);

        verify(userRepo, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Demote ORG_ADMIN → TEACHER")
    void shouldDemoteOrgAdminToTeacher() {
        User user = memberWithRole(Role.ORG_ADMIN);
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));
        when(userRepo.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        useCase.demote(orgId, userIdRaw, actorId);

        verify(userRepo).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getRole()).isEqualTo(Role.TEACHER);
    }

    @Test
    @DisplayName("Demote chính mình → ValidationException")
    void shouldRejectDemotingSelf() {
        // userIdRaw == actorId
        assertThatThrownBy(() -> useCase.demote(orgId, userIdRaw, userIdRaw))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("chính mình");

        verify(userRepo, never()).findById(userId);
    }

    @Test
    @DisplayName("Demote user không phải ORG_ADMIN → ValidationException")
    void shouldRejectDemotingNonOrgAdmin() {
        User user = memberWithRole(Role.TEACHER);
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> useCase.demote(orgId, userIdRaw, actorId))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("không phải ORG_ADMIN");

        verify(userRepo, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Demote user not in org → EntityNotFoundException")
    void shouldRejectDemotingNonMember() {
        User user = User.builder()
                .id(userId)
                .username("testuser")
                .email(Email.of("test@example.com"))
                .password("encoded")
                .fullName("Test User")
                .role(Role.ORG_ADMIN)
                .enabled(true)
                .organizationId(UUID.randomUUID()) // different org
                .build();
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> useCase.demote(orgId, userIdRaw, actorId))
                .isInstanceOf(EntityNotFoundException.class);

        verify(userRepo, never()).save(any(User.class));
    }
}
