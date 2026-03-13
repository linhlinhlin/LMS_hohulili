package com.example.lms.shared.application.port;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * Application port for the SePay QR payment gateway.
 *
 * SePay flow:
 *  1. createQrUrl() → returns a QR image URL (https://qr.sepay.vn/img?...)
 *  2. User scans QR → bank transfer with our transferContent in description
 *  3. SePay detects the transfer → POST webhook to our endpoint
 *  4. verifyWebhook() → verify the Authorization: Apikey header
 *  5. extractTransactionId() → parse our payment UUID from the webhook payload
 *  6. Payment marked COMPLETED → student enrolled
 */
public interface SepayPaymentPort {

    /** True when SePay is fully configured and enabled. */
    boolean isEnabled();

    /**
     * Returns the SePay QR image URL for the given transaction.
     * The QR encodes: bankCode + accountNumber + amount + transferContent.
     * transferContent is derived from txnId (UUID without dashes, uppercase).
     */
    String generateQrUrl(UUID txnId, BigDecimal amount);

    /**
     * Returns the transferContent string that will be embedded in the QR.
     * This is what the payer puts in the bank transfer description.
     */
    String getTransferContent(UUID txnId);

    /**
     * Verifies the webhook Authorization header.
     * SePay sends: Authorization: Apikey {webhookApiKey}
     */
    boolean verifyWebhook(String authorizationHeader);

    /**
     * Extracts the payment transaction UUID from the SePay webhook payload.
     * Parses the "content" field (bank transfer description) to extract our UUID.
     * Returns null if parsing fails.
     */
    UUID extractTransactionId(Map<String, Object> payload);

    /**
     * Extracts the transferred amount from the webhook payload.
     * Returns null if not present.
     */
    BigDecimal extractTransferAmount(Map<String, Object> payload);

    /**
     * Extracts SePay's transaction code from the webhook payload.
     * Used for audit/reconciliation.
     */
    String extractTransactionCode(Map<String, Object> payload);

    String getBankCode();
    String getAccountNumber();
    String getAccountName();
}
