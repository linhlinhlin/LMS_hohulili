package com.example.lms.identity.application.usecase;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Issue #258 (Phase 4 PR 3): Promote/demote ORG_ADMIN workflow tests.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("PromoteOrgAdminUseCase Tests")
class PromoteOrgAdminUseCaseTest {

    @Mock
    private UserJpaRepository userRepo;

    @InjectMocks
    private PromoteOrgAdminUseCase useCase;

    @Captor
    private ArgumentCaptor<UserJpaEntity> userCaptor;

    private UUID orgId;
    private UUID userId;
    private UUID actorId;

    @BeforeEach
    void setUp() {
        orgId = UUID.randomUUID();
        userId = UUID.randomUUID();
        actorId = UUID.randomUUID();
    }

    private UserJpaEntity memberWithRole(UserJpaEntity.UserRole role) {
        UserJpaEntity user = new UserJpaEntity();
        user.setId(userId);
        user.setOrganizationId(orgId);
        user.setRole(role);
        return user;
    }

    @Test
    @DisplayName("Promote STUDENT → ORG_ADMIN")
    void shouldPromoteStudentToOrgAdmin() {
        UserJpaEntity user = memberWithRole(UserJpaEntity.UserRole.STUDENT);
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));

        useCase.promote(orgId, userId, actorId);

        verify(userRepo).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getRole()).isEqualTo(UserJpaEntity.UserRole.ORG_ADMIN);
    }

    @Test
    @DisplayName("Promote TEACHER → ORG_ADMIN")
    void shouldPromoteTeacherToOrgAdmin() {
        UserJpaEntity user = memberWithRole(UserJpaEntity.UserRole.TEACHER);
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));

        useCase.promote(orgId, userId, actorId);

        verify(userRepo).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getRole()).isEqualTo(UserJpaEntity.UserRole.ORG_ADMIN);
    }

    @Test
    @DisplayName("Promote user role=ADMIN → ValidationException (system role bảo toàn)")
    void shouldRejectPromotingSystemAdmin() {
        UserJpaEntity user = memberWithRole(UserJpaEntity.UserRole.ADMIN);
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> useCase.promote(orgId, userId, actorId))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("ADMIN");

        verify(userRepo, never()).save(user);
    }

    @Test
    @DisplayName("Promote user not in org → EntityNotFoundException")
    void shouldRejectPromotingNonMember() {
        UserJpaEntity user = memberWithRole(UserJpaEntity.UserRole.STUDENT);
        user.setOrganizationId(UUID.randomUUID()); // different org
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> useCase.promote(orgId, userId, actorId))
                .isInstanceOf(EntityNotFoundException.class);

        verify(userRepo, never()).save(user);
    }

    @Test
    @DisplayName("Promote already ORG_ADMIN → idempotent no-op")
    void shouldBeIdempotentPromote() {
        UserJpaEntity user = memberWithRole(UserJpaEntity.UserRole.ORG_ADMIN);
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));

        useCase.promote(orgId, userId, actorId);

        verify(userRepo, never()).save(user);
    }

    @Test
    @DisplayName("Demote ORG_ADMIN → TEACHER")
    void shouldDemoteOrgAdminToTeacher() {
        UserJpaEntity user = memberWithRole(UserJpaEntity.UserRole.ORG_ADMIN);
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));

        useCase.demote(orgId, userId, actorId);

        verify(userRepo).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getRole()).isEqualTo(UserJpaEntity.UserRole.TEACHER);
    }

    @Test
    @DisplayName("Demote chính mình → ValidationException")
    void shouldRejectDemotingSelf() {
        // userId == actorId
        assertThatThrownBy(() -> useCase.demote(orgId, userId, userId))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("chính mình");

        verify(userRepo, never()).findById(userId);
    }

    @Test
    @DisplayName("Demote user không phải ORG_ADMIN → ValidationException")
    void shouldRejectDemotingNonOrgAdmin() {
        UserJpaEntity user = memberWithRole(UserJpaEntity.UserRole.TEACHER);
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> useCase.demote(orgId, userId, actorId))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("không phải ORG_ADMIN");

        verify(userRepo, never()).save(user);
    }

    @Test
    @DisplayName("Demote user not in org → EntityNotFoundException")
    void shouldRejectDemotingNonMember() {
        UserJpaEntity user = memberWithRole(UserJpaEntity.UserRole.ORG_ADMIN);
        user.setOrganizationId(UUID.randomUUID()); // different org
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> useCase.demote(orgId, userId, actorId))
                .isInstanceOf(EntityNotFoundException.class);

        verify(userRepo, never()).save(user);
    }
}
