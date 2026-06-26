package com.example.lms.shared.application.port;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

/**
 * Optional extension point for non-course payment targets.
 *
 * Course checkout remains backed by payment_transactions. Other bounded contexts
 * can complete their own payment references without making shared payment depend
 * on their domain classes.
 */
public interface ExternalPaymentCompletionPort {
    Optional<Result> tryComplete(UUID referenceId, BigDecimal transferredAmount, String gatewayTransactionCode);

    record Result(boolean success, String message) {
        public static Result success(String message) {
            return new Result(true, message);
        }

        public static Result failure(String message) {
            return new Result(false, message);
        }
    }
}
