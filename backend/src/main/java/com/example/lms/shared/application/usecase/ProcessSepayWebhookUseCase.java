package com.example.lms.shared.application.usecase;

import com.example.lms.shared.application.port.SepayPaymentPort;
import com.example.lms.shared.domain.model.PaymentTransaction;
import com.example.lms.shared.domain.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * Processes incoming SePay webhook notifications.
 *
 * SePay webhook flow:
 *  1. SePay detects a bank transfer matching our QR's transferContent
 *  2. POSTs to /api/v3/payments/sepay/webhook with Authorization: Bearer {apiKey}
 *  3. We verify the API key
 *  4. We extract the payment UUID from order.order_invoice_number
 *  5. We find the PENDING payment and mark it COMPLETED
 *  6. Controller then auto-enrolls the student
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ProcessSepayWebhookUseCase {

    private final PaymentRepository paymentRepository;
    private final SepayPaymentPort sepayPayment;

    public record WebhookResult(boolean success, String message, PaymentTransaction payment) {
        static WebhookResult success(PaymentTransaction p) {
            return new WebhookResult(true, "Payment confirmed", p);
        }
        static WebhookResult alreadyProcessed() {
            return new WebhookResult(true, "Already processed", null);
        }
        static WebhookResult unauthorized() {
            return new WebhookResult(false, "Unauthorized", null);
        }
        static WebhookResult invalid(String reason) {
            return new WebhookResult(false, reason, null);
        }
    }

    public WebhookResult execute(Map<String, Object> payload, String authorizationHeader) {
        // 1. Verify API key
        if (!sepayPayment.verifyWebhook(authorizationHeader)) {
            log.warn("[SePay] Webhook rejected — invalid or missing API key");
            return WebhookResult.unauthorized();
        }

        log.info("[SePay] Webhook payload: {}", payload);

        // 2. Extract payment UUID from webhook payload
        UUID txnId = sepayPayment.extractTransactionId(payload);
        if (txnId == null) {
            log.warn("[SePay] Cannot extract transaction ID from payload");
            return WebhookResult.invalid("Cannot extract transaction ID");
        }

        // 3. Find the payment
        var paymentOpt = paymentRepository.findById(txnId);
        if (paymentOpt.isEmpty()) {
            log.warn("[SePay] Payment not found: {}", txnId);
            return WebhookResult.invalid("Payment not found: " + txnId);
        }

        var payment = paymentOpt.get();

        // 4. Idempotency — if already COMPLETED, return success without re-processing
        if (payment.isCompleted()) {
            log.info("[SePay] Payment {} already completed — skipping", txnId);
            return WebhookResult.alreadyProcessed();
        }

        if (!payment.isPending()) {
            log.warn("[SePay] Payment {} not PENDING (status={})", txnId, payment.getStatus());
            return WebhookResult.invalid("Payment not in PENDING state");
        }

        // 5. Log amount validation (informational — don't reject; SePay already validated)
        BigDecimal transferredAmount = sepayPayment.extractTransferAmount(payload);
        if (transferredAmount != null && !payment.isAmountMatch(transferredAmount)) {
            log.warn("[SePay] Amount mismatch txn={}: expected={} got={}",
                    txnId, payment.getAmount(), transferredAmount);
            // Still proceed — SePay already validated the transfer on their end
        }

        // 6. Store SePay transaction code and mark completed
        String sepayTxnCode = sepayPayment.extractTransactionCode(payload);
        payment.setSepayMetadata(sepayTxnCode);
        payment.markCompleted();
        payment = paymentRepository.save(payment);

        log.info("[SePay] Payment {} completed — student={} course={} txnCode={}",
                txnId, payment.getStudentId(), payment.getCourseId(), sepayTxnCode);

        return WebhookResult.success(payment);
    }
}
