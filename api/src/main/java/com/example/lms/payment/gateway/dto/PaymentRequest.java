package com.example.lms.payment.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * PaymentRequest - Request object for creating a payment
 * 
 * SOTA Design (Dec 2025):
 * - Gateway-agnostic fields
 * - All required data for any payment gateway
 * - Extensible via metadata map
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequest {
    
    /**
     * Internal order/payment ID (UUID string)
     */
    private String orderId;
    
    /**
     * Payment amount in VND (or configured currency)
     */
    private BigDecimal amount;
    
    /**
     * Original amount before discount (for display)
     */
    private BigDecimal originalAmount;
    
    /**
     * Currency code (default: VND)
     */
    @Builder.Default
    private String currency = "VND";
    
    /**
     * Order description/info shown to customer
     */
    private String orderInfo;
    
    /**
     * Order type (e.g., "course_purchase", "subscription")
     */
    @Builder.Default
    private String orderType = "course_purchase";
    
    /**
     * Customer's IP address (required by most gateways)
     */
    private String ipAddress;
    
    /**
     * Customer's email
     */
    private String customerEmail;
    
    /**
     * Customer's name
     */
    private String customerName;
    
    /**
     * Customer's phone
     */
    private String customerPhone;
    
    /**
     * URL to redirect after payment (frontend)
     */
    private String returnUrl;
    
    /**
     * URL for IPN/webhook (backend)
     */
    private String ipnUrl;
    
    /**
     * Locale for payment page (e.g., "vn", "en")
     */
    @Builder.Default
    private String locale = "vn";
    
    /**
     * Additional gateway-specific data
     */
    private Map<String, Object> metadata;
    
    /**
     * Course ID (LMS-specific)
     */
    private UUID courseId;
    
    /**
     * Student ID (LMS-specific)
     */
    private UUID studentId;
}
