package com.example.lms.shared.infrastructure.service;

import com.example.lms.shared.application.usecase.CreateRevenueSplitUseCase;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RevenueSplitReconciliationSchedulerTest {

    @Mock
    private PaymentTransactionJpaRepository paymentTransactionJpaRepository;

    @Mock
    private CreateRevenueSplitUseCase createRevenueSplitUseCase;

    @InjectMocks
    private RevenueSplitReconciliationScheduler scheduler;

    @Test
    @DisplayName("scheduler repairs every completed payment missing a revenue split")
    void reconcileMissingRevenueSplitsRepairsAllPayments() {
        UUID paymentA = UUID.randomUUID();
        UUID paymentB = UUID.randomUUID();
        when(paymentTransactionJpaRepository.findCompletedPaymentIdsWithoutRevenueSplit(any()))
                .thenReturn(List.of(paymentA, paymentB));

        scheduler.reconcileMissingRevenueSplits();

        verify(createRevenueSplitUseCase).execute(paymentA);
        verify(createRevenueSplitUseCase).execute(paymentB);
    }

    @Test
    @DisplayName("scheduler continues after one repair failure")
    void reconcileMissingRevenueSplitsContinuesAfterFailure() {
        UUID failingPayment = UUID.randomUUID();
        UUID healthyPayment = UUID.randomUUID();
        when(paymentTransactionJpaRepository.findCompletedPaymentIdsWithoutRevenueSplit(any()))
                .thenReturn(List.of(failingPayment, healthyPayment));
        doThrow(new IllegalStateException("boom"))
                .when(createRevenueSplitUseCase).execute(failingPayment);

        scheduler.reconcileMissingRevenueSplits();

        verify(createRevenueSplitUseCase).execute(failingPayment);
        verify(createRevenueSplitUseCase).execute(healthyPayment);
        verify(createRevenueSplitUseCase, times(2)).execute(any(UUID.class));
    }
}
