package com.example.lms.payment.gateway;

import com.example.lms.payment.gateway.dto.*;

import java.util.Map;

/**
 * PaymentGateway - Core interface for all payment gateway implementations
 * 
 * SOTA Design (Dec 2025):
 * - Strategy Pattern: Each gateway implements this interface
 * - Future-Proof: Add new gateways without changing business logic
 * - Supports: VNPay, ZaloPay, MoMo, Bank Transfer, and custom implementations
 * 
 * Usage:
 *   PaymentGateway gateway = gatewayFactory.getGateway("VNPAY");
 *   PaymentUrlResult result = gateway.createPaymentUrl(request);
 * 
 * To add your own payment system later:
 *   1. Create a class that implements this interface
 *   2. Annotate with @Component
 *   3. Set payment.default-gateway in config
 *   4. No other code changes needed!
 */
public interface PaymentGateway {
    
    // ===========================================================
    // IDENTIFICATION
    // ===========================================================
    
    /**
     * Get unique gateway code (e.g., "VNPAY", "MOMO", "OWN_SYSTEM")
     * This is used by the factory to locate the gateway
     * 
     * @return Gateway code in uppercase
     */
    String getGatewayCode();
    
    /**
     * Get human-readable display name
     * 
     * @return Display name (e.g., "VNPay", "Ví MoMo")
     */
    String getDisplayName();
    
    /**
     * Check if this gateway is currently available
     * Can be disabled via config or if external service is down
     * 
     * @return true if gateway can process payments
     */
    boolean isAvailable();
    
    // ===========================================================
    // PAYMENT OPERATIONS
    // ===========================================================
    
    /**
     * Create a payment URL for customer redirect
     * 
     * For redirect-based gateways (VNPay, MoMo):
     *   - Returns URL to redirect customer to gateway page
     *   
     * For instant gateways (Simulated):
     *   - Returns instantComplete=true with transactionId
     *   
     * @param request Payment request with order details
     * @return Result containing payment URL or instant completion
     */
    PaymentUrlResult createPaymentUrl(PaymentRequest request);
    
    /**
     * Verify callback/IPN from gateway
     * 
     * CRITICAL: Always verify signature to prevent fraud!
     * 
     * @param params Raw parameters from gateway (query string or body)
     * @return Verification result with normalized data
     */
    PaymentCallbackResult verifyCallback(Map<String, String> params);
    
    /**
     * Query transaction status from gateway
     * 
     * Use for:
     *   - Checking pending transactions
     *   - Reconciliation
     *   - Customer support
     * 
     * @param transactionId Gateway transaction ID
     * @return Current status of the transaction
     */
    default PaymentCallbackResult queryTransaction(String transactionId) {
        // Default: not supported
        return PaymentCallbackResult.failed("Query not supported by this gateway");
    }
    
    // ===========================================================
    // REFUND OPERATIONS
    // ===========================================================
    
    /**
     * Process a refund request
     * 
     * @param request Refund request with details
     * @return Refund result
     */
    default RefundResult processRefund(RefundRequest request) {
        // Default: not supported
        return RefundResult.failed("NOT_SUPPORTED", "Refund not supported by this gateway");
    }
    
    /**
     * Check if this gateway supports refunds
     * 
     * @return true if refunds are supported
     */
    default boolean supportsRefund() {
        return false;
    }
    
    // ===========================================================
    // CONFIGURATION
    // ===========================================================
    
    /**
     * Get minimum payment amount (in VND)
     * 
     * @return Minimum amount, or 0 if no minimum
     */
    default long getMinAmount() {
        return 10000L; // Default: 10,000 VND
    }
    
    /**
     * Get maximum payment amount (in VND)
     * 
     * @return Maximum amount, or Long.MAX_VALUE if no maximum
     */
    default long getMaxAmount() {
        return 500_000_000L; // Default: 500 million VND
    }
    
    /**
     * Get supported currencies
     * 
     * @return Array of currency codes
     */
    default String[] getSupportedCurrencies() {
        return new String[]{"VND"};
    }
    
    /**
     * Get payment session timeout in seconds
     * 
     * @return Timeout in seconds (default: 15 minutes)
     */
    default int getPaymentTimeoutSeconds() {
        return 900; // 15 minutes
    }
}
