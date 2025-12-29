package com.example.lms.payment.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * RefundRequest - Request object for processing refunds
 * 
 * SOTA Design (Dec 2025):
 * - Supports both full and partial refunds
 * - Gateway-agnostic fields
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundRequest {
    
    /**
     * Original payment ID (internal)
     */
    private UUID paymentId;
    
    /**
     * Original transaction ID from gateway
     */
    private String originalTransactionId;
    
    /**
     * Gateway's original order ID
     */
    private String gatewayOrderId;
    
    /**
     * Refund amount (may be less than original for partial refund)
     */
    private BigDecimal refundAmount;
    
    /**
     * Original payment amount
     */
    private BigDecimal originalAmount;
    
    /**
     * Reason for refund
     */
    private String reason;
    
    /**
     * Refund type: FULL or PARTIAL
     */
    @Builder.Default
    private RefundType refundType = RefundType.FULL;
    
    /**
     * User who requested the refund
     */
    private UUID requestedBy;
    
    /**
     * Admin who approved the refund
     */
    private UUID approvedBy;
    
    /**
     * Customer's IP address
     */
    private String ipAddress;
    
    /**
     * Additional metadata
     */
    private Map<String, Object> metadata;
    
    public enum RefundType {
        FULL,
        PARTIAL
    }
}
