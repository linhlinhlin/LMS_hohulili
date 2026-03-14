package com.example.lms.shared.infrastructure.eventhandler;

import com.example.lms.shared.application.usecase.CreateRevenueSplitUseCase;
import com.example.lms.shared.domain.event.PaymentCompletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Listens for PaymentCompletedEvent and creates the revenue split record.
 * <p>
 * Uses REQUIRES_NEW inside CreateRevenueSplitUseCase, so a failure here
 * does NOT roll back the original payment transaction.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentCompletedEventHandler {

    private final CreateRevenueSplitUseCase createRevenueSplitUseCase;

    @EventListener
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        try {
            createRevenueSplitUseCase.execute(event.getPaymentId());
        } catch (Exception ex) {
            // Log and swallow — revenue split failure must not affect payment confirmation
            log.error("[Revenue] Failed to create revenue split for payment {}. Reconciliation scheduler will retry.",
                    event.getPaymentId(), ex);
        }
    }
}
