package com.example.lms.learning_delivery.application.port;

import java.util.UUID;

/**
 * Application port for verifying payment status.
 * Used by SelfEnrollUseCase to check if a student has paid for a course.
 */
public interface PaymentVerificationPort {

    boolean hasCompletedPayment(UUID studentId, UUID courseId);
}
