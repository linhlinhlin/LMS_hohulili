package com.example.lms.payment.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

/**
 * PaymentUrlResult - Result from creating a payment URL
 * 
 * SOTA Design (Dec 2025):
 * - Supports both redirect flow (VNPay, MoMo) and instant flow (Simulated)
 * - Contains all info needed for frontend handling
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentUrlResult {
    
    /**
     * Whether the operation was successful
     */
    private boolean success;
    
    /**
     * Error message if not successful
     */
    private String errorMessage;
    
    /**
     * Error code from gateway
     */
    private String errorCode;
    
    /**
     * Payment URL to redirect user (for redirect-based gateways)
     */
    private String paymentUrl;
    
    /**
     * QR code data/URL (for QR-based payments like MoMo)
     */
    private String qrCodeData;
    
    /**
     * Gateway's order ID (for tracking)
     */
    private String gatewayOrderId;
    
    /**
     * Transaction ID from gateway (if available immediately)
     */
    private String transactionId;
    
    /**
     * When this payment URL expires
     */
    private Instant expiresAt;
    
    /**
     * Whether payment completed instantly (for simulated gateway)
     * If true, no redirect needed - payment is already complete
     */
    @Builder.Default
    private boolean instantComplete = false;
    
    /**
     * Additional data from gateway
     */
    private Map<String, Object> metadata;
    
    // === FACTORY METHODS ===
    
    public static PaymentUrlResult success(String paymentUrl, String gatewayOrderId) {
        return PaymentUrlResult.builder()
                .success(true)
                .paymentUrl(paymentUrl)
                .gatewayOrderId(gatewayOrderId)
                .build();
    }
    
    public static PaymentUrlResult instantSuccess(String transactionId) {
        return PaymentUrlResult.builder()
                .success(true)
                .instantComplete(true)
                .transactionId(transactionId)
                .build();
    }
    
    public static PaymentUrlResult failed(String errorMessage) {
        return PaymentUrlResult.builder()
                .success(false)
                .errorMessage(errorMessage)
                .build();
    }
    
    public static PaymentUrlResult failed(String errorCode, String errorMessage) {
        return PaymentUrlResult.builder()
                .success(false)
                .errorCode(errorCode)
                .errorMessage(errorMessage)
                .build();
    }
}
