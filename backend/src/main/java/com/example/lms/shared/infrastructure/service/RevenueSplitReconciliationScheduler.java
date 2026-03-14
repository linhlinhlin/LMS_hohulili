package com.example.lms.shared.infrastructure.service;

import com.example.lms.shared.application.usecase.CreateRevenueSplitUseCase;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Repairs revenue split projection drift when payment confirmation succeeded but
 * split creation failed asynchronously.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RevenueSplitReconciliationScheduler {

    private static final int BATCH_SIZE = 100;

    private final PaymentTransactionJpaRepository paymentTransactionJpaRepository;
    private final CreateRevenueSplitUseCase createRevenueSplitUseCase;

    @Scheduled(fixedDelayString = "${lms.revenue.reconciliation.fixed-delay-ms:1800000}")
    public void reconcileMissingRevenueSplits() {
        List<UUID> paymentIds = paymentTransactionJpaRepository.findCompletedPaymentIdsWithoutRevenueSplit(
                PageRequest.of(0, BATCH_SIZE));

        if (paymentIds.isEmpty()) {
            log.debug("[RevenueReconciliation] No missing revenue splits found");
            return;
        }

        int healed = 0;
        int failed = 0;

        for (UUID paymentId : paymentIds) {
            try {
                createRevenueSplitUseCase.execute(paymentId);
                healed++;
            } catch (Exception ex) {
                failed++;
                log.error("[RevenueReconciliation] Failed to repair revenue split for payment {}", paymentId, ex);
            }
        }

        log.info("[RevenueReconciliation] Processed {} payment(s): healed={}, failed={}",
                paymentIds.size(), healed, failed);
    }
}
