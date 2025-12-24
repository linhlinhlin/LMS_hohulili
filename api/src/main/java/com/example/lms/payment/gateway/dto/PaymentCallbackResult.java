package com.example.lms.payment.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

/**
 * PaymentCallbackResult - Result from verifying gateway callback/IPN
 * 
 * SOTA Design (Dec 2025):
 * - Unified result for all gateway callbacks
 * - Contains normalized data regardless of gateway
 * - Raw response preserved for debugging/auditing
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCallbackResult {
    
    /**
     * Whether the callback verification was successful
     */
    private boolean success;
    
    /**
     * Whether signature verification passed
     */
    private boolean signatureValid;
    
    /**
     * Internal order ID (from our system)
     */
    private String orderId;
    
    /**
     * Gateway's transaction ID
     */
    private String transactionId;
    
    /**
     * Gateway's order/reference ID
     */
    private String gatewayOrderId;
    
    /**
     * Payment amount (verify against expected)
     */
    private BigDecimal amount;
    
    /**
     * Currency code
     */
    private String currency;
    
    /**
     * Payment status from gateway
     */
    private PaymentStatusCode statusCode;
    
    /**
     * Human-readable message
     */
    private String message;
    
    /**
     * Gateway-specific response code
     */
    private String gatewayResponseCode;
    
    /**
     * Bank code (if applicable)
     */
    private String bankCode;
    
    /**
     * Card type (if applicable)
     */
    private String cardType;
    
    /**
     * Payment time from gateway
     */
    private Instant paymentTime;
    
    /**
     * Raw response from gateway (for auditing)
     */
    private Map<String, String> rawResponse;
    
    /**
     * Normalized payment status codes
     */
    public enum PaymentStatusCode {
        SUCCESS,           // Payment completed successfully
        PENDING,           // Payment is pending/processing
        FAILED,            // Payment failed
        CANCELLED,         // User cancelled
        EXPIRED,           // Payment session expired
        INSUFFICIENT_FUNDS,// Not enough balance
        INVALID_CARD,      // Card validation failed
        UNKNOWN            // Unknown status
    }
    
    // === FACTORY METHODS ===
    
    public static PaymentCallbackResult success(String orderId, String transactionId, BigDecimal amount) {
        return PaymentCallbackResult.builder()
                .success(true)
                .signatureValid(true)
                .statusCode(PaymentStatusCode.SUCCESS)
                .orderId(orderId)
                .transactionId(transactionId)
                .amount(amount)
                .message("Payment successful")
                .build();
    }
    
    public static PaymentCallbackResult failed(String message) {
        return PaymentCallbackResult.builder()
                .success(false)
                .statusCode(PaymentStatusCode.FAILED)
                .message(message)
                .build();
    }
    
    public static PaymentCallbackResult invalidSignature() {
        return PaymentCallbackResult.builder()
                .success(false)
                .signatureValid(false)
                .statusCode(PaymentStatusCode.FAILED)
                .message("Invalid signature - possible tampering detected")
                .build();
    }
}
