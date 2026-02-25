package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.application.port.PaymentVerificationPort;
import com.example.lms.shared.infrastructure.persistence.entity.PaymentTransactionJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PaymentVerificationAdapter implements PaymentVerificationPort {

    private final PaymentTransactionJpaRepository paymentRepository;

    @Override
    public boolean hasCompletedPayment(UUID studentId, UUID courseId) {
        return paymentRepository.findByStudentIdAndCourseId(studentId, courseId)
                .map(p -> p.getStatus() == PaymentTransactionJpaEntity.PaymentStatus.COMPLETED)
                .orElse(false);
    }
}
