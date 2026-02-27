package com.example.lms.shared.application.usecase;

import com.example.lms.shared.domain.model.PaymentTransaction;
import com.example.lms.shared.domain.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Use case for simulated payment checkout (dev-only).
 * Creates a COMPLETED payment immediately and auto-enrolls.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CheckoutUseCase {

    private final PaymentRepository paymentRepository;

    public PaymentTransaction execute(UUID studentId, UUID courseId, BigDecimal serverPrice, String paymentMethod) {
        // Check for existing completed payment
        var existing = paymentRepository.findLatestByStudentAndCourse(studentId, courseId);
        if (existing.isPresent() && existing.get().isCompleted()) {
            return existing.get();
        }

        var payment = PaymentTransaction.createSimulated(studentId, courseId, serverPrice, paymentMethod);
        payment = paymentRepository.save(payment);

        log.info("[Payment] Simulated checkout completed for student {} course {}", studentId, courseId);
        return payment;
    }
}
