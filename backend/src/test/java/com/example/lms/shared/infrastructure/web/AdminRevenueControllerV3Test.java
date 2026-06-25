package com.example.lms.shared.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.application.usecase.ProcessPayoutUseCase;
import com.example.lms.shared.domain.model.PayoutRequest;
import com.example.lms.shared.domain.model.TeacherBankAccount;
import com.example.lms.shared.domain.repository.PayoutRequestRepository;
import com.example.lms.shared.domain.repository.TeacherBankAccountRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminRevenueControllerV3 Tests")
class AdminRevenueControllerV3Test {

    @Mock private ProcessPayoutUseCase processPayoutUseCase;
    @Mock private PayoutRequestRepository payoutRepo;
    @Mock private UserJpaRepository userRepo;
    @Mock private TeacherBankAccountRepository bankAccountRepo;

    @InjectMocks
    private AdminRevenueControllerV3 controller;

    @Nested
    @DisplayName("List payouts")
    class ListPayouts {

        @Test
        @DisplayName("ADMIN should see full account number")
        void adminShouldSeeFullAccountNumber() {
            UserJpaEntity admin = user(UserJpaEntity.UserRole.ADMIN, UUID.randomUUID(), "Admin", "admin@maritime.edu");
            UUID teacherId = UUID.randomUUID();
            UUID bankId = UUID.randomUUID();
            PayoutRequest payout = payout(teacherId, bankId, PayoutRequest.Status.PENDING);
            TeacherBankAccount bank = bank(bankId, teacherId, "1234567890");
            UserJpaEntity teacher = user(UserJpaEntity.UserRole.TEACHER, teacherId, "Teacher A", "teacher.a@maritime.edu");

            when(payoutRepo.findAllByStatus("PENDING", PageRequest.of(0, 20)))
                    .thenReturn(new PageImpl<>(List.of(payout), PageRequest.of(0, 20), 1));
            when(userRepo.findAllById(List.of(teacherId))).thenReturn(List.of(teacher));
            when(bankAccountRepo.findByIds(List.of(bankId))).thenReturn(List.of(bank));

            var response = controller.listPayouts("PENDING", 0, 20, admin);

            assertThat(response.getBody()).isNotNull();
            Page<AdminRevenueControllerV3.PayoutListDto> page = response.getBody().getData();
            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).accountNumber()).isEqualTo("1234567890");

            verify(payoutRepo).findAllByStatus("PENDING", PageRequest.of(0, 20));
            verify(payoutRepo, never()).findAllByStatusAndTeacherIds(any(), any(), any());
            verify(bankAccountRepo).findByIds(List.of(bankId));
            verify(bankAccountRepo, never()).findById(any());
        }

        @Test
        @DisplayName("ORG_ADMIN should only see same-org payouts with masked account number")
        void orgAdminShouldSeeOnlySameOrgPayouts() {
            UUID orgId = UUID.randomUUID();
            UUID teacherId = UUID.randomUUID();
            UUID bankId = UUID.randomUUID();
            UserJpaEntity orgAdmin = user(UserJpaEntity.UserRole.ORG_ADMIN, UUID.randomUUID(), "Org Admin", "orgadmin@maritime.edu");
            orgAdmin.setOrganizationId(orgId);
            UserJpaEntity teacher = user(UserJpaEntity.UserRole.TEACHER, teacherId, "Teacher Org", "teacher@org.edu");
            teacher.setOrganizationId(orgId);
            PayoutRequest payout = payoutWithId(UUID.randomUUID(), orgId, teacherId, bankId, PayoutRequest.Status.APPROVED);
            TeacherBankAccount bank = bank(bankId, teacherId, "9876543210");

            when(payoutRepo.findAllByStatusAndOrganizationId(eq("APPROVED"), eq(orgId), any(PageRequest.class)))
                    .thenReturn(new PageImpl<>(List.of(payout), PageRequest.of(0, 20), 1));
            when(userRepo.findAllById(List.of(teacherId))).thenReturn(List.of(teacher));
            when(bankAccountRepo.findByIds(List.of(bankId))).thenReturn(List.of(bank));

            var response = controller.listPayouts("APPROVED", 0, 20, orgAdmin);

            assertThat(response.getBody()).isNotNull();
            Page<AdminRevenueControllerV3.PayoutListDto> page = response.getBody().getData();
            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).teacherEmail()).isEqualTo("teacher@org.edu");
            assertThat(page.getContent().get(0).accountNumber()).isEqualTo("****3210");

            verify(payoutRepo, never()).findAllByStatus(any(), any());
            verify(payoutRepo, never()).findAllByStatusAndTeacherIds(any(), any(), any());
        }

        @Test
        @DisplayName("ORG_ADMIN without organization should receive empty page")
        void orgAdminWithoutOrganizationShouldReceiveEmptyPage() {
            UserJpaEntity orgAdmin = user(UserJpaEntity.UserRole.ORG_ADMIN, UUID.randomUUID(), "Org Admin", "orgadmin@maritime.edu");

            var response = controller.listPayouts("PENDING", 0, 20, orgAdmin);

            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getData().getContent()).isEmpty();
            verify(payoutRepo, never()).findAllByStatus(any(), any());
            verify(payoutRepo, never()).findAllByStatusAndTeacherIds(any(), any(), any());
            verify(payoutRepo, never()).findAllByStatusAndOrganizationId(any(), any(), any());
        }
    }

    @Nested
    @DisplayName("Payout actions")
    class Actions {

        @Test
        @DisplayName("ORG_ADMIN should approve same-org payout")
        void orgAdminShouldApproveSameOrgPayout() {
            UUID orgId = UUID.randomUUID();
            UUID teacherId = UUID.randomUUID();
            UUID bankId = UUID.randomUUID();
            UUID payoutId = UUID.randomUUID();
            UserJpaEntity orgAdmin = user(UserJpaEntity.UserRole.ORG_ADMIN, UUID.randomUUID(), "Org Admin", "orgadmin@maritime.edu");
            orgAdmin.setOrganizationId(orgId);
            UserJpaEntity teacher = user(UserJpaEntity.UserRole.TEACHER, teacherId, "Teacher Org", "teacher@org.edu");
            teacher.setOrganizationId(orgId);
            PayoutRequest payout = PayoutRequest.reconstitute(
                    payoutId,
                    orgId,
                    teacherId,
                    bankId,
                    BigDecimal.valueOf(200000),
                    PayoutRequest.Status.APPROVED,
                    null,
                    "Approved",
                    orgAdmin.getId(),
                    Instant.now().minusSeconds(7200),
                    Instant.now().minusSeconds(3600)
            );

            when(processPayoutUseCase.approve(payoutId, orgAdmin.getId(), "ok")).thenReturn(payout);
            when(payoutRepo.findById(payoutId)).thenReturn(Optional.of(payout));
            when(userRepo.findById(payout.getTeacherId())).thenReturn(Optional.of(teacher));
            when(bankAccountRepo.findById(bankId)).thenReturn(Optional.of(bank(bankId, teacherId, "1234567890")));

            var response = controller.approve(payoutId, new AdminRevenueControllerV3.AdminNoteBody("ok"), orgAdmin);

            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getData().teacherId()).isEqualTo(teacherId);
            verify(processPayoutUseCase).approve(payoutId, orgAdmin.getId(), "ok");
        }

        @Test
        @DisplayName("ORG_ADMIN should not approve other-org payout")
        void orgAdminShouldNotApproveOtherOrgPayout() {
            UUID orgId = UUID.randomUUID();
            UUID teacherId = UUID.randomUUID();
            UUID payoutId = UUID.randomUUID();
            UserJpaEntity orgAdmin = user(UserJpaEntity.UserRole.ORG_ADMIN, UUID.randomUUID(), "Org Admin", "orgadmin@maritime.edu");
            orgAdmin.setOrganizationId(orgId);
            UUID otherOrgId = UUID.randomUUID();
            PayoutRequest payout = payoutWithId(payoutId, otherOrgId, teacherId, UUID.randomUUID(), PayoutRequest.Status.PENDING);

            when(payoutRepo.findById(payoutId)).thenReturn(Optional.of(payout));

            assertThatThrownBy(() -> controller.approve(payoutId, new AdminRevenueControllerV3.AdminNoteBody("deny"), orgAdmin))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("tổ chức khác");

            verify(processPayoutUseCase, never()).approve(any(), any(), any());
        }
    }

    private static UserJpaEntity user(UserJpaEntity.UserRole role, UUID id, String fullName, String email) {
        UserJpaEntity user = new UserJpaEntity();
        user.setId(id);
        user.setRole(role);
        user.setFullName(fullName);
        user.setEmail(email);
        return user;
    }

    private static TeacherBankAccount bank(UUID bankId, UUID teacherId, String accountNumber) {
        return TeacherBankAccount.reconstitute(
                bankId,
                teacherId,
                "VCB",
                accountNumber,
                "TEACHER HOLDER",
                true,
                true,
                Instant.now().minusSeconds(86400)
        );
    }

    private static PayoutRequest payout(UUID teacherId, UUID bankId, PayoutRequest.Status status) {
        return payoutWithId(UUID.randomUUID(), teacherId, bankId, status);
    }

    private static PayoutRequest payoutWithId(UUID payoutId, UUID teacherId, UUID bankId, PayoutRequest.Status status) {
        return payoutWithId(payoutId, null, teacherId, bankId, status);
    }

    private static PayoutRequest payoutWithId(
            UUID payoutId,
            UUID organizationId,
            UUID teacherId,
            UUID bankId,
            PayoutRequest.Status status
    ) {
        return PayoutRequest.reconstitute(
                payoutId,
                organizationId,
                teacherId,
                bankId,
                BigDecimal.valueOf(150000),
                status,
                "Teacher note",
                null,
                null,
                Instant.now().minusSeconds(3600),
                null
        );
    }
}
