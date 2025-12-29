package com.example.lms.payment.controller;

import com.example.lms.payment.gateway.PaymentGatewayFactory;
import com.example.lms.payment.gateway.dto.PaymentCallbackResult;
import com.example.lms.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * PaymentCallbackController - Handles payment gateway callbacks/IPNs
 * 
 * SOTA Design (Dec 2025):
 * - Separate endpoints for each gateway
 * - Proper IPN response format for each gateway
 * - Secure signature verification before processing
 * 
 * Endpoints:
 * - GET  /api/v1/payments/callback/vnpay      - VNPay return URL
 * - POST /api/v1/payments/callback/vnpay/ipn  - VNPay IPN
 * - POST /api/v1/payments/callback/momo       - MoMo callback
 * - POST /api/v1/payments/callback/zalopay    - ZaloPay callback
 */
@RestController
@RequestMapping("/api/v1/payments/callback")
@RequiredArgsConstructor
@Slf4j
public class PaymentCallbackController {
    
    private final PaymentGatewayFactory gatewayFactory;
    private final PaymentService paymentService;
    
    @Value("${payment.frontend-url:http://localhost:4200}")
    private String frontendUrl;
    
    @Value("${payment.success-url:${payment.frontend-url}/payment/success}")
    private String successUrl;
    
    @Value("${payment.failed-url:${payment.frontend-url}/payment/failed}")
    private String failedUrl;
    
    // =====================================================
    // VNPAY CALLBACKS
    // =====================================================
    
    /**
     * VNPay Return URL - User is redirected here after payment
     * This is for user experience, not for business logic
     */
    @GetMapping("/vnpay")
    public ResponseEntity<?> vnpayReturnUrl(@RequestParam Map<String, String> params) {
        log.info("VNPay Return URL called with params: {}", sanitizeLogParams(params));
        
        try {
            // Verify callback
            PaymentCallbackResult result = gatewayFactory.getGateway("VNPAY").verifyCallback(params);
            
            if (!result.isSignatureValid()) {
                log.warn("VNPay: Invalid signature detected");
                return redirectTo(failedUrl + "?reason=invalid_signature");
            }
            
            // Process payment if not already processed
            if (result.isSuccess()) {
                // Note: Actual business logic should be in IPN, not return URL
                // This is just for user redirect
                String redirectUrl = successUrl + 
                        "?txn=" + result.getTransactionId() + 
                        "&orderId=" + result.getOrderId();
                return redirectTo(redirectUrl);
            } else {
                String redirectUrl = failedUrl + 
                        "?reason=" + result.getStatusCode() + 
                        "&message=" + encodeUrl(result.getMessage());
                return redirectTo(redirectUrl);
            }
            
        } catch (Exception e) {
            log.error("VNPay Return URL error", e);
            return redirectTo(failedUrl + "?reason=error&message=" + encodeUrl(e.getMessage()));
        }
    }
    
    /**
     * VNPay IPN (Instant Payment Notification) - Server-to-server callback
     * This is where critical business logic should happen
     */
    @PostMapping("/vnpay/ipn")
    public ResponseEntity<Map<String, String>> vnpayIPN(@RequestParam Map<String, String> params) {
        log.info("VNPay IPN called with params: {}", sanitizeLogParams(params));
        
        Map<String, String> response = new HashMap<>();
        
        try {
            // Verify callback
            PaymentCallbackResult result = gatewayFactory.getGateway("VNPAY").verifyCallback(params);
            
            if (!result.isSignatureValid()) {
                log.warn("VNPay IPN: Invalid signature");
                response.put("RspCode", "97");
                response.put("Message", "Invalid Signature");
                return ResponseEntity.ok(response);
            }
            
            // Process the payment
            boolean processed = paymentService.processGatewayCallback("VNPAY", result);
            
            if (processed) {
                response.put("RspCode", "00");
                response.put("Message", "Confirm Success");
            } else {
                // Already processed or order not found
                response.put("RspCode", "02");
                response.put("Message", "Order already confirmed");
            }
            
        } catch (Exception e) {
            log.error("VNPay IPN processing error", e);
            response.put("RspCode", "99");
            response.put("Message", "Unknown error");
        }
        
        return ResponseEntity.ok(response);
    }
    
    // =====================================================
    // MOMO CALLBACKS (Future)
    // =====================================================
    
    @PostMapping("/momo")
    public ResponseEntity<Map<String, Object>> momoCallback(@RequestBody Map<String, Object> body) {
        log.info("MoMo callback received");
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Convert to string map for gateway processing
            Map<String, String> params = body.entrySet().stream()
                    .collect(Collectors.toMap(
                            Map.Entry::getKey,
                            e -> e.getValue() != null ? e.getValue().toString() : ""
                    ));
            
            PaymentCallbackResult result = gatewayFactory.getGateway("MOMO").verifyCallback(params);
            
            if (result.isSuccess()) {
                paymentService.processGatewayCallback("MOMO", result);
                response.put("resultCode", 0);
                response.put("message", "Success");
            } else {
                response.put("resultCode", 1);
                response.put("message", result.getMessage());
            }
            
        } catch (Exception e) {
            log.error("MoMo callback error", e);
            response.put("resultCode", 99);
            response.put("message", "Processing error");
        }
        
        return ResponseEntity.ok(response);
    }
    
    // =====================================================
    // ZALOPAY CALLBACKS (Future)
    // =====================================================
    
    @PostMapping("/zalopay")
    public ResponseEntity<Map<String, Object>> zalopayCallback(@RequestBody Map<String, Object> body) {
        log.info("ZaloPay callback received");
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            Map<String, String> params = body.entrySet().stream()
                    .collect(Collectors.toMap(
                            Map.Entry::getKey,
                            e -> e.getValue() != null ? e.getValue().toString() : ""
                    ));
            
            PaymentCallbackResult result = gatewayFactory.getGateway("ZALOPAY").verifyCallback(params);
            
            if (result.isSuccess()) {
                paymentService.processGatewayCallback("ZALOPAY", result);
                response.put("return_code", 1);
                response.put("return_message", "Success");
            } else {
                response.put("return_code", 2);
                response.put("return_message", result.getMessage());
            }
            
        } catch (Exception e) {
            log.error("ZaloPay callback error", e);
            response.put("return_code", 0);
            response.put("return_message", "Processing error");
        }
        
        return ResponseEntity.ok(response);
    }
    
    // =====================================================
    // SIMULATED CALLBACK (For testing)
    // =====================================================
    
    @PostMapping("/simulated")
    public ResponseEntity<Map<String, Object>> simulatedCallback(@RequestBody Map<String, Object> body) {
        log.info("Simulated callback received (for testing)");
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Simulated callback processed");
        
        return ResponseEntity.ok(response);
    }
    
    // =====================================================
    // HELPER METHODS
    // =====================================================
    
    private ResponseEntity<?> redirectTo(String url) {
        return ResponseEntity.status(HttpStatus.FOUND)
                .header("Location", url)
                .build();
    }
    
    private String encodeUrl(String value) {
        if (value == null) return "";
        try {
            return java.net.URLEncoder.encode(value, "UTF-8");
        } catch (Exception e) {
            return value;
        }
    }
    
    private Map<String, String> sanitizeLogParams(Map<String, String> params) {
        // Remove sensitive data before logging
        Map<String, String> safe = new HashMap<>(params);
        safe.remove("vnp_SecureHash");
        safe.remove("vnp_SecureHashType");
        // Keep only first 4 chars of card number if present
        if (safe.containsKey("vnp_CardNumber")) {
            String card = safe.get("vnp_CardNumber");
            safe.put("vnp_CardNumber", card.length() > 4 ? card.substring(0, 4) + "****" : "****");
        }
        return safe;
    }
}
