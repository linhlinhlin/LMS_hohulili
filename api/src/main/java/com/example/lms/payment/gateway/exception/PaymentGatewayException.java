package com.example.lms.payment.gateway.exception;

/**
 * PaymentGatewayException - Custom exception for payment gateway errors
 * 
 * SOTA Design (Dec 2025):
 * - Contains error code for programmatic handling
 * - Contains message for logging/display
 * - Extends RuntimeException for cleaner method signatures
 */
public class PaymentGatewayException extends RuntimeException {
    
    private final String errorCode;
    private final String gatewayCode;
    
    public PaymentGatewayException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
        this.gatewayCode = null;
    }
    
    public PaymentGatewayException(String errorCode, String message, String gatewayCode) {
        super(message);
        this.errorCode = errorCode;
        this.gatewayCode = gatewayCode;
    }
    
    public PaymentGatewayException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.gatewayCode = null;
    }
    
    public PaymentGatewayException(String errorCode, String message, String gatewayCode, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.gatewayCode = gatewayCode;
    }
    
    public String getErrorCode() {
        return errorCode;
    }
    
    public String getGatewayCode() {
        return gatewayCode;
    }
    
    // Common error codes
    public static final String GATEWAY_NOT_FOUND = "GATEWAY_NOT_FOUND";
    public static final String GATEWAY_UNAVAILABLE = "GATEWAY_UNAVAILABLE";
    public static final String INVALID_SIGNATURE = "INVALID_SIGNATURE";
    public static final String PAYMENT_FAILED = "PAYMENT_FAILED";
    public static final String PAYMENT_EXPIRED = "PAYMENT_EXPIRED";
    public static final String REFUND_FAILED = "REFUND_FAILED";
    public static final String AMOUNT_MISMATCH = "AMOUNT_MISMATCH";
    public static final String DUPLICATE_TRANSACTION = "DUPLICATE_TRANSACTION";
    public static final String NETWORK_ERROR = "NETWORK_ERROR";
    public static final String CONFIGURATION_ERROR = "CONFIGURATION_ERROR";
}
