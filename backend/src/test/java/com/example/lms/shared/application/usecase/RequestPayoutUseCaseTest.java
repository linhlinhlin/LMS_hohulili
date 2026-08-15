package com.example.lms.shared.application.usecase;

import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.application.port.LearningPackageRevenuePort;
import com.example.lms.shared.application.port.RevenueConfigPort;
import com.example.lms.shared.domain.model.OrgPaymentConfig;
import com.example.lms.shared.domain.model.PayoutRequest;
import com.example.lms.shared.domain.model.TeacherBankAccount;
import com.example.lms.shared.domain.repository.PayoutRequestRepository;
import com.example.lms.shared.domain.repository.RevenueSplitRepository;
import com.example.lms.shared.domain.repository.TeacherBankAccountRepository;
import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.domain.valueobject.UserId;
import com.example.lms.shared.exception.BusinessRuleException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("RequestPayoutUseCase Tests")
class RequestPayoutUseCaseTest {

    @Mock private PayoutRequestRepository payoutRepo;
    @Mock private RevenueSplitRepository splitRepo;
    @Mock private TeacherBankAccountRepository bankRepo;
    @Mock private UserRepository userRepo;
    @Mock private RevenueConfigPort revenueConfigPort;
    @Mock private LearningPackageRevenuePort learningPackageRevenuePort;

    @InjectMocks
    private RequestPayoutUseCase useCase;

    @Test
    @DisplayName("execute should snapshot teacher organization on payout request")
    void executeShouldSnapshotTeacherOrganization() {
        UUID orgId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        UUID bankId = UUID.randomUUID();
        TeacherBankAccount bankAccount = TeacherBankAccount.reconstitute(
                bankId,
                teacherId,
                "VCB",
                "1234567890",
                "TEACHER HOLDER",
                true,
                true,
                Instant.now().minusSeconds(86400)
        );
        User teacher = User.builder()
                .id(UserId.of(teacherId))
                .username("teacher")
                .email(Email.of("teacher@maritime.edu"))
                .password("encoded")
                .fullName("Teacher")
                .role(Role.TEACHER)
                .enabled(true)
                .organizationId(orgId)
                .build();

        when(bankRepo.findById(bankId)).thenReturn(Optional.of(bankAccount));
        when(userRepo.findById(UserId.of(teacherId))).thenReturn(Optional.of(teacher));
        when(revenueConfigPort.resolveConfig(orgId))
                .thenReturn(OrgPaymentConfig.create(orgId, BigDecimal.valueOf(20), BigDecimal.valueOf(70), BigDecimal.valueOf(100000)));
        when(splitRepo.sumTeacherAmountByTeacherId(teacherId)).thenReturn(BigDecimal.valueOf(500000));
        when(learningPackageRevenuePort.sumTeacherAmountByTeacherId(teacherId)).thenReturn(BigDecimal.ZERO);
        when(payoutRepo.sumCompletedByTeacherId(teacherId)).thenReturn(BigDecimal.ZERO);
        when(payoutRepo.sumPendingAndApprovedByTeacherId(teacherId)).thenReturn(BigDecimal.ZERO);
        when(payoutRepo.save(any(PayoutRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PayoutRequest result = useCase.execute(teacherId, bankId, BigDecimal.valueOf(200000), "Withdraw");

        assertThat(result.getOrganizationId()).isEqualTo(orgId);
        assertThat(result.getTeacherId()).isEqualTo(teacherId);
        assertThat(result.getBankAccountId()).isEqualTo(bankId);
    }

    @Test
    @DisplayName("execute should include learning package revenue in available balance")
    void executeShouldIncludeLearningPackageRevenueInAvailableBalance() {
        UUID orgId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        UUID bankId = UUID.randomUUID();
        TeacherBankAccount bankAccount = TeacherBankAccount.reconstitute(
                bankId,
                teacherId,
                "VCB",
                "1234567890",
                "TEACHER HOLDER",
                true,
                true,
                Instant.now().minusSeconds(86400)
        );
        User teacher = User.builder()
                .id(UserId.of(teacherId))
                .username("teacher")
                .email(Email.of("teacher@maritime.edu"))
                .password("encoded")
                .fullName("Teacher")
                .role(Role.TEACHER)
                .enabled(true)
                .organizationId(orgId)
                .build();

        when(bankRepo.findById(bankId)).thenReturn(Optional.of(bankAccount));
        when(userRepo.findById(UserId.of(teacherId))).thenReturn(Optional.of(teacher));
        when(revenueConfigPort.resolveConfig(orgId))
                .thenReturn(OrgPaymentConfig.create(orgId, BigDecimal.valueOf(20), BigDecimal.valueOf(70), BigDecimal.valueOf(100000)));
        when(splitRepo.sumTeacherAmountByTeacherId(teacherId)).thenReturn(BigDecimal.valueOf(200000));
        when(learningPackageRevenuePort.sumTeacherAmountByTeacherId(teacherId)).thenReturn(BigDecimal.valueOf(300000));
        when(payoutRepo.sumCompletedByTeacherId(teacherId)).thenReturn(BigDecimal.ZERO);
        when(payoutRepo.sumPendingAndApprovedByTeacherId(teacherId)).thenReturn(BigDecimal.ZERO);
        when(payoutRepo.save(any(PayoutRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PayoutRequest result = useCase.execute(teacherId, bankId, BigDecimal.valueOf(450000), "Package revenue");

        assertThat(result.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(450000));
        verify(payoutRepo).save(any(PayoutRequest.class));
    }

    @Test
    @DisplayName("cancel should soft-cancel pending payout owned by teacher")
    void cancelShouldSoftCancelPendingPayout() {
        UUID payoutId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        PayoutRequest request = PayoutRequest.reconstitute(
                payoutId,
                teacherId,
                UUID.randomUUID(),
                BigDecimal.valueOf(250000),
                PayoutRequest.Status.PENDING,
                "Teacher note",
                null,
                null,
                Instant.now().minusSeconds(3600),
                null
        );
        when(payoutRepo.findById(payoutId)).thenReturn(Optional.of(request));

        useCase.cancel(payoutId, teacherId);

        assertThat(request.getStatus()).isEqualTo(PayoutRequest.Status.CANCELLED);
        assertThat(request.getAdminNote()).isEqualTo("Giảng viên đã hủy yêu cầu rút tiền");
        assertThat(request.getProcessedAt()).isNotNull();
        assertThat(request.getProcessedBy()).isNull();
        verify(payoutRepo).save(request);
    }

    @Test
    @DisplayName("cancel should reject payout owned by another teacher")
    void cancelShouldRejectAnotherTeachersPayout() {
        UUID payoutId = UUID.randomUUID();
        PayoutRequest request = PayoutRequest.reconstitute(
                payoutId,
                UUID.randomUUID(),
                UUID.randomUUID(),
                BigDecimal.valueOf(100000),
                PayoutRequest.Status.PENDING,
                null,
                null,
                null,
                Instant.now(),
                null
        );
        when(payoutRepo.findById(payoutId)).thenReturn(Optional.of(request));

        assertThatThrownBy(() -> useCase.cancel(payoutId, UUID.randomUUID()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403 FORBIDDEN");
        verify(payoutRepo, never()).save(request);
    }

    @Test
    @DisplayName("cancel should reject non-pending payout")
    void cancelShouldRejectNonPendingPayout() {
        UUID payoutId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        PayoutRequest request = PayoutRequest.reconstitute(
                payoutId,
                teacherId,
                UUID.randomUUID(),
                BigDecimal.valueOf(100000),
                PayoutRequest.Status.APPROVED,
                null,
                "Approved",
                UUID.randomUUID(),
                Instant.now().minusSeconds(7200),
                Instant.now().minusSeconds(3600)
        );
        when(payoutRepo.findById(payoutId)).thenReturn(Optional.of(request));

        assertThatThrownBy(() -> useCase.cancel(payoutId, teacherId))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("đang chờ duyệt");
        verify(payoutRepo, never()).save(request);
    }
}
