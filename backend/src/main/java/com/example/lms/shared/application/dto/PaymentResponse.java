package com.example.lms.shared.application.dto;

import com.example.lms.shared.domain.model.PaymentTransaction;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Response DTO for payment data.
 */
public record PaymentResponse(
    String id,
    String courseId,
    String courseTitle,
    BigDecimal amount,
    String currency,
    String status,
    String transactionId,
    String paymentMethod,
    String paidAt,
    String createdAt,
    String accessActivationState,
    String accessActivationMessage
) {
    public static PaymentResponse from(PaymentTransaction payment, String courseTitle) {
        return from(payment, courseTitle, null, null);
    }

    public static PaymentResponse from(
        PaymentTransaction payment,
        String courseTitle,
        String accessActivationState,
        String accessActivationMessage
    ) {
        return new PaymentResponse(
            payment.getId().toString(),
            payment.getCourseId().toString(),
            courseTitle,
            payment.getAmount(),
            payment.getCurrency(),
            payment.getStatus().name(),
            payment.getTransactionId(),
            payment.getPaymentMethod(),
            payment.getPaidAt() != null ? payment.getPaidAt().toString() : null,
            payment.getCreatedAt() != null ? payment.getCreatedAt().toString() : null,
            accessActivationState,
            accessActivationMessage
        );
    }

    /**
     * Convert to Map for backward-compatible API response.
     */
    public Map<String, Object> toMap() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", id);
        map.put("courseId", courseId);
        map.put("courseTitle", courseTitle);
        map.put("amount", amount);
        map.put("currency", currency);
        map.put("status", status);
        map.put("transactionId", transactionId);
        map.put("paymentMethod", paymentMethod);
        map.put("paidAt", paidAt);
        map.put("createdAt", createdAt);
        map.put("accessActivationState", accessActivationState);
        map.put("accessActivationMessage", accessActivationMessage);
        return map;
    }
}
