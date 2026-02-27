package com.example.lms.shared.application.usecase;

import com.example.lms.shared.domain.model.PaymentTransaction;
import com.example.lms.shared.domain.repository.PaymentRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Use case for processing admin refunds.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RefundPaymentUseCase {

    private final PaymentRepository paymentRepository;

    public PaymentTransaction execute(UUID paymentId, String reason, String adminNote, String adminEmail) {
        var payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new EntityNotFoundException("PaymentTransaction", paymentId));

        payment.refund(reason, adminNote);
        payment = paymentRepository.save(payment);

        log.info("[Payment] Admin {} refunded payment {} for course {} (reason: {})",
                adminEmail, paymentId, payment.getCourseId(), reason);

        return payment;
    }
}
