package com.example.lms.payment.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

/**
 * RefundResult - Result from processing a refund
 * 
 * SOTA Design (Dec 2025):
 * - Unified result for all gateway refunds
 * - Tracks refund status through lifecycle
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundResult {
    
    /**
     * Whether the refund operation was successful
     */
    private boolean success;
    
    /**
     * Gateway's refund transaction ID
     */
    private String refundTransactionId;
    
    /**
     * Refund status
     */
    private RefundStatusCode statusCode;
    
    /**
     * Refunded amount
     */
    private BigDecimal refundedAmount;
    
    /**
     * Human-readable message
     */
    private String message;
    
    /**
     * Error code if failed
     */
    private String errorCode;
    
    /**
     * When refund was processed
     */
    private Instant processedAt;
    
    /**
     * Estimated time for refund to reach customer (if applicable)
     */
    private Instant estimatedCompletionTime;
    
    /**
     * Raw response from gateway
     */
    private Map<String, Object> rawResponse;
    
    /**
     * Refund status codes
     */
    public enum RefundStatusCode {
        SUCCESS,           // Refund completed
        PENDING,           // Refund is processing
        FAILED,            // Refund failed
        PARTIAL,           // Partial refund completed
        REJECTED,          // Refund rejected by gateway
        TIMEOUT            // Refund request timed out
    }
    
    // === FACTORY METHODS ===
    
    public static RefundResult success(String refundTransactionId, BigDecimal amount) {
        return RefundResult.builder()
                .success(true)
                .statusCode(RefundStatusCode.SUCCESS)
                .refundTransactionId(refundTransactionId)
                .refundedAmount(amount)
                .message("Refund processed successfully")
                .processedAt(Instant.now())
                .build();
    }
    
    public static RefundResult pending(String refundTransactionId) {
        return RefundResult.builder()
                .success(true)
                .statusCode(RefundStatusCode.PENDING)
                .refundTransactionId(refundTransactionId)
                .message("Refund is being processed")
                .build();
    }
    
    public static RefundResult failed(String errorCode, String message) {
        return RefundResult.builder()
                .success(false)
                .statusCode(RefundStatusCode.FAILED)
                .errorCode(errorCode)
                .message(message)
                .build();
    }
}
