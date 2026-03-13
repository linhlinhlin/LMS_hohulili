package com.example.lms.shared.infrastructure.sepay;

import com.example.lms.shared.application.port.SepayPaymentPort;
import com.example.lms.shared.exception.BusinessRuleException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

/**
 * SePay QR payment gateway adapter.
 *
 * Transfer content encoding:
 *   txnId (UUID) → 32-char uppercase hex string (remove dashes)
 *   e.g. 1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d → 1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D
 *
 * This string is put in the QR "des" parameter.  SePay matches incoming bank
 * transfers by this content and echoes it back in the webhook as
 * order.order_invoice_number.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SepayGatewayAdapter implements SepayPaymentPort {

    private static final String QR_BASE_URL = "https://qr.sepay.vn/img";

    private final SepayConfig config;

    // ==================== SepayPaymentPort ====================

    @Override
    public boolean isEnabled() {
        return config.isEnabled();
    }

    @Override
    public String generateQrUrl(UUID txnId, BigDecimal amount) {
        validateConfig();
        String transferContent = getTransferContent(txnId);

        String url = QR_BASE_URL
                + "?bank=" + encode(config.getBankCode())
                + "&acc=" + encode(config.getAccountNumber())
                + "&amount=" + amount.longValue()
                + "&des=" + encode(transferContent)
                + "&template=" + encode(config.getTemplateCode());

        log.info("[SePay] Generated QR URL for txn: {}", txnId);
        return url;
    }

    @Override
    public String getTransferContent(UUID txnId) {
        // UUID without dashes, uppercase — 32 hex chars, safe for all Vietnamese banks
        return txnId.toString().replace("-", "").toUpperCase();
    }

    @Override
    public boolean verifyWebhook(String authorizationHeader) {
        if (config.getWebhookApiKey() == null || config.getWebhookApiKey().isBlank()) {
            log.warn("[SePay] Webhook API key not configured — rejecting webhook");
            return false;
        }
        if (authorizationHeader == null) return false;
        String expected = "Bearer " + config.getWebhookApiKey();
        return expected.equals(authorizationHeader.trim());
    }

    @Override
    public UUID extractTransactionId(Map<String, Object> payload) {
        // Primary: order.order_invoice_number
        Object orderObj = payload.get("order");
        if (orderObj instanceof Map<?, ?> order) {
            Object invoiceNum = order.get("order_invoice_number");
            if (invoiceNum instanceof String s && !s.isBlank()) {
                UUID id = parseUUIDFromContent(s);
                if (id != null) return id;
            }
        }
        // Fallback: top-level "content" (the raw bank transfer description)
        Object content = payload.get("content");
        if (content instanceof String s && !s.isBlank()) {
            return parseUUIDFromContent(s);
        }
        return null;
    }

    @Override
    public BigDecimal extractTransferAmount(Map<String, Object> payload) {
        // Try transaction.transferAmount first
        Object txn = payload.get("transaction");
        if (txn instanceof Map<?, ?> txnMap) {
            Object amount = txnMap.get("transferAmount");
            if (amount instanceof Number n) return BigDecimal.valueOf(n.longValue());
        }
        // Try order.amount
        Object order = payload.get("order");
        if (order instanceof Map<?, ?> orderMap) {
            Object amount = orderMap.get("amount");
            if (amount instanceof Number n) return BigDecimal.valueOf(n.longValue());
        }
        // Try top-level transferAmount
        Object transferAmount = payload.get("transferAmount");
        if (transferAmount instanceof Number n) return BigDecimal.valueOf(n.longValue());
        return null;
    }

    @Override
    public String extractTransactionCode(Map<String, Object> payload) {
        Object txn = payload.get("transaction");
        if (txn instanceof Map<?, ?> txnMap) {
            Object code = txnMap.get("code");
            if (code instanceof String s) return s;
        }
        Object code = payload.get("code");
        if (code instanceof String s) return s;
        return null;
    }

    @Override
    public String getBankCode() { return config.getBankCode(); }

    @Override
    public String getAccountNumber() { return config.getAccountNumber(); }

    @Override
    public String getAccountName() { return config.getAccountName(); }

    // ==================== Helpers ====================

    /**
     * Parses a UUID from a transferContent string.
     * Strips all non-hex chars, takes first 32, formats as UUID.
     */
    private static UUID parseUUIDFromContent(String content) {
        String hex = content.replaceAll("[^0-9a-fA-F]", "");
        if (hex.length() < 32) return null;
        String h = hex.substring(0, 32).toLowerCase();
        try {
            return UUID.fromString(
                    h.substring(0, 8) + "-" + h.substring(8, 12) + "-" +
                    h.substring(12, 16) + "-" + h.substring(16, 20) + "-" +
                    h.substring(20));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private void validateConfig() {
        if (!config.isEnabled()) {
            throw new BusinessRuleException(
                    "Cổng thanh toán SePay chưa được kích hoạt. Vui lòng liên hệ quản trị viên.");
        }
        if (config.getBankCode() == null || config.getBankCode().isBlank()) {
            throw new BusinessRuleException(
                    "Cổng thanh toán SePay chưa được cấu hình (bank code trống). Vui lòng liên hệ quản trị viên.");
        }
        if (config.getAccountNumber() == null || config.getAccountNumber().isBlank()) {
            throw new BusinessRuleException(
                    "Cổng thanh toán SePay chưa được cấu hình (số tài khoản trống). Vui lòng liên hệ quản trị viên.");
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }
}
