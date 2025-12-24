package com.example.lms.payment.gateway.simulated;

import com.example.lms.payment.gateway.PaymentGateway;
import com.example.lms.payment.gateway.dto.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * SimulatedGateway - Development/Testing payment gateway
 * 
 * SOTA Design (Dec 2025):
 * - Instant payment completion (no redirect)
 * - Configurable success/failure for testing
 * - Always enabled in development
 * 
 * Use cases:
 * - Local development without real credentials
 * - Automated testing
 * - Demo/presentation mode
 */
@Component
@ConditionalOnProperty(
        prefix = "payment.simulated",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = true  // Enabled by default
)
@Slf4j
public class SimulatedGateway implements PaymentGateway {
    
    private static final String GATEWAY_CODE = "SIMULATED";
    private static final String DISPLAY_NAME = "Thanh toán giả lập (Test)";
    
    @Override
    public String getGatewayCode() {
        return GATEWAY_CODE;
    }
    
    @Override
    public String getDisplayName() {
        return DISPLAY_NAME;
    }
    
    @Override
    public boolean isAvailable() {
        return true; // Always available in dev
    }
    
    @Override
    public PaymentUrlResult createPaymentUrl(PaymentRequest request) {
        log.info("SimulatedGateway: Processing payment for order {}, amount: {}", 
                request.getOrderId(), request.getAmount());
        
        // Validate request
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return PaymentUrlResult.failed("INVALID_AMOUNT", "Amount must be greater than 0");
        }
        
        // Simulate processing delay (optional)
        simulateDelay(100);
        
        // Generate simulated transaction ID
        String transactionId = generateTransactionId();
        
        log.info("SimulatedGateway: Payment successful. Transaction ID: {}", transactionId);
        
        // Return instant success (no redirect needed)
        return PaymentUrlResult.builder()
                .success(true)
                .instantComplete(true)
                .transactionId(transactionId)
                .gatewayOrderId("SIM_ORDER_" + request.getOrderId())
                .metadata(Map.of(
                        "gateway", GATEWAY_CODE,
                        "processedAt", Instant.now().toString(),
                        "note", "This is a simulated payment for testing purposes"
                ))
                .build();
    }
    
    @Override
    public PaymentCallbackResult verifyCallback(Map<String, String> params) {
        log.info("SimulatedGateway: Verifying callback with params: {}", params);
        
        String transactionId = params.getOrDefault("transactionId", 
                params.getOrDefault("vnp_TransactionNo", "SIM_" + UUID.randomUUID()));
        String orderId = params.getOrDefault("orderId", 
                params.getOrDefault("vnp_TxnRef", ""));
        String amountStr = params.getOrDefault("amount", 
                params.getOrDefault("vnp_Amount", "0"));
        
        BigDecimal amount;
        try {
            amount = new BigDecimal(amountStr);
            // VNPay sends amount * 100, adjust if needed
            if (amount.compareTo(new BigDecimal("1000000")) > 0) {
                amount = amount.divide(new BigDecimal("100"));
            }
        } catch (NumberFormatException e) {
            amount = BigDecimal.ZERO;
        }
        
        // Simulated gateway always returns success
        return PaymentCallbackResult.builder()
                .success(true)
                .signatureValid(true)
                .statusCode(PaymentCallbackResult.PaymentStatusCode.SUCCESS)
                .transactionId(transactionId)
                .orderId(orderId)
                .amount(amount)
                .message("Simulated payment verified successfully")
                .paymentTime(Instant.now())
                .rawResponse(params)
                .build();
    }
    
    @Override
    public PaymentCallbackResult queryTransaction(String transactionId) {
        log.info("SimulatedGateway: Querying transaction {}", transactionId);
        
        // Simulated gateway always returns success for any transaction
        return PaymentCallbackResult.builder()
                .success(true)
                .signatureValid(true)
                .statusCode(PaymentCallbackResult.PaymentStatusCode.SUCCESS)
                .transactionId(transactionId)
                .message("Transaction found and completed")
                .paymentTime(Instant.now())
                .build();
    }
    
    @Override
    public RefundResult processRefund(RefundRequest request) {
        log.info("SimulatedGateway: Processing refund for transaction {}, amount: {}", 
                request.getOriginalTransactionId(), request.getRefundAmount());
        
        String refundTransactionId = "SIM_REFUND_" + UUID.randomUUID().toString().substring(0, 8);
        
        return RefundResult.success(refundTransactionId, request.getRefundAmount());
    }
    
    @Override
    public boolean supportsRefund() {
        return true;
    }
    
    @Override
    public long getMinAmount() {
        return 1000L; // 1,000 VND for testing
    }
    
    @Override
    public long getMaxAmount() {
        return Long.MAX_VALUE; // No limit for testing
    }
    
    @Override
    public int getPaymentTimeoutSeconds() {
        return Integer.MAX_VALUE; // No timeout for simulated
    }
    
    // === HELPER METHODS ===
    
    private String generateTransactionId() {
        return "SIM_" + System.currentTimeMillis() + "_" + 
               UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
    
    private void simulateDelay(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
