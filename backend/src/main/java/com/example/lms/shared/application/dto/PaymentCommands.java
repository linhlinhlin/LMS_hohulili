package com.example.lms.shared.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Command DTOs for Payment use cases.
 */
public final class PaymentCommands {

    private PaymentCommands() {}

    public record SimulatedCheckoutCommand(
        @NotNull UUID courseId,
        String paymentMethod
    ) {}

    public record VnPayCheckoutCommand(
        @NotNull UUID courseId
    ) {}

    public record RefundCommand(
        @NotBlank String reason,
        String adminNote
    ) {}
}
