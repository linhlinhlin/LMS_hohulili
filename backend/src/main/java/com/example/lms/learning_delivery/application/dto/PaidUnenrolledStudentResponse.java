package com.example.lms.learning_delivery.application.dto;

import com.example.lms.shared.domain.model.PaymentTransaction;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for paid but unenrolled students.
 * Used for Option B: teacher assigns students to class after payment.
 */
public record PaidUnenrolledStudentResponse(
        UUID studentId,
        String fullName,
        String email,
        Instant paidAt,
        BigDecimal amount,
        String paymentId
) {
    public static PaidUnenrolledStudentResponse from(UUID studentId, String fullName, String email, PaymentTransaction payment) {
        return new PaidUnenrolledStudentResponse(
                studentId,
                fullName,
                email,
                payment.getPaidAt(),
                payment.getAmount(),
                payment.getId().toString()
        );
    }
}
