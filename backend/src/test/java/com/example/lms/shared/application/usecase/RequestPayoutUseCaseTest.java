package com.example.lms.shared.application.usecase;

import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.domain.model.PayoutRequest;
import com.example.lms.shared.domain.repository.PayoutRequestRepository;
import com.example.lms.shared.domain.repository.RevenueSplitRepository;
import com.example.lms.shared.domain.repository.TeacherBankAccountRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.infrastructure.service.RevenueConfigService;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("RequestPayoutUseCase Tests")
class RequestPayoutUseCaseTest {

    @Mock private PayoutRequestRepository payoutRepo;
    @Mock private RevenueSplitRepository splitRepo;
    @Mock private TeacherBankAccountRepository bankRepo;
    @Mock private UserJpaRepository userRepo;
    @Mock private RevenueConfigService revenueConfigService;

    @InjectMocks
    private RequestPayoutUseCase useCase;

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
        assertThat(request.getAdminNote()).isEqualTo("Teacher cancelled request");
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
