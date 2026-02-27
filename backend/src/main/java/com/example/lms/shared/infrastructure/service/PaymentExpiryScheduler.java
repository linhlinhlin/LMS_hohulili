package com.example.lms.shared.infrastructure.service;

import com.example.lms.shared.domain.model.PaymentTransaction;
import com.example.lms.shared.domain.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Scheduled job to expire stale PENDING payments.
 *
 * VNPay payments that remain PENDING for over 1 hour are considered abandoned
 * (VNPay's payment window is 15 minutes). This prevents stale PENDING records
 * from accumulating and confusing payment status checks.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentExpiryScheduler {

    private final PaymentRepository paymentRepository;

    /**
     * Runs daily at 2:00 AM (server timezone) to expire old PENDING payments.
     */
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void expireStalePayments() {
        Instant cutoff = Instant.now().minus(1, ChronoUnit.HOURS);

        List<PaymentTransaction> stalePayments = paymentRepository.findStalePending(cutoff);

        if (stalePayments.isEmpty()) {
            log.debug("[PaymentExpiry] No stale PENDING payments found");
            return;
        }

        int count = 0;
        for (var payment : stalePayments) {
            payment.markExpired();
            paymentRepository.save(payment);
            count++;
        }

        log.info("[PaymentExpiry] Expired {} stale PENDING payments (older than {})", count, cutoff);
    }
}
