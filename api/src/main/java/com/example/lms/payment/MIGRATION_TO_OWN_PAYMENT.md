# Hướng dẫn Chuyển sang Hệ thống Payment Tự Thân

**Date**: December 25, 2025  
**Version**: 1.0.0  
**Author**: AI Team  

---

## 📋 Tổng quan

Tài liệu này hướng dẫn cách **chuyển từ gateway bên thứ 3 (VNPay, MoMo) sang hệ thống thanh toán tự xây dựng** mà **KHÔNG cần thay đổi code nghiệp vụ** trong PaymentService hoặc các components khác.

### Kiến trúc hiện tại

```
┌─────────────────────────────────────────────────────────┐
│                PaymentService                            │
│  (KHÔNG CẦN SỬA khi thêm gateway mới)                   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│         PaymentGateway Interface + Factory               │
│                    (Core Abstraction)                    │
└────────────────────────┬────────────────────────────────┘
                         │
     ┌───────────────────┼───────────────────┐
     │                   │                   │
┌────▼────┐       ┌──────▼──────┐    ┌───────▼───────┐
│ VNPayGW │       │ SimulatedGW │    │ OwnGateway 🔮 │
│  (Now)  │       │   (Now)     │    │   (Future)    │
└─────────┘       └─────────────┘    └───────────────┘
```

---

## 🚀 Các bước implement Own Payment Gateway

### Bước 1: Tạo Class mới implement PaymentGateway

```java
package com.example.lms.payment.gateway.own;

import com.example.lms.payment.gateway.PaymentGateway;
import com.example.lms.payment.gateway.dto.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;

/**
 * OwnPaymentGateway - Hệ thống thanh toán tự thân
 * 
 * Implement interface PaymentGateway để tích hợp vào hệ thống
 * mà KHÔNG cần sửa code ở PaymentService
 */
@Component
@ConditionalOnProperty(
        prefix = "payment.own-system",
        name = "enabled",
        havingValue = "true"
)
@Slf4j
public class OwnPaymentGateway implements PaymentGateway {
    
    private static final String GATEWAY_CODE = "OWN_SYSTEM";
    private static final String DISPLAY_NAME = "Hệ thống thanh toán nội bộ";
    
    @Value("${payment.own-system.api-url}")
    private String apiUrl;
    
    @Value("${payment.own-system.api-key}")
    private String apiKey;
    
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
        return apiUrl != null && !apiUrl.isEmpty();
    }
    
    @Override
    public PaymentUrlResult createPaymentUrl(PaymentRequest request) {
        log.info("OwnGateway: Creating payment for order {}", request.getOrderId());
        
        // TODO: Implement your own payment logic here
        // 1. Call your banking API
        // 2. Create payment session
        // 3. Return payment URL or QR code
        
        // Example implementation:
        try {
            // Call your payment API
            // String paymentUrl = yourPaymentApi.createPayment(request);
            
            // For now, return instant success (like simulated)
            String transactionId = "OWN_" + System.currentTimeMillis();
            
            return PaymentUrlResult.builder()
                    .success(true)
                    .instantComplete(true)  // Set false nếu cần redirect
                    .transactionId(transactionId)
                    .build();
                    
        } catch (Exception e) {
            log.error("OwnGateway: Payment creation failed", e);
            return PaymentUrlResult.failed("PAYMENT_ERROR", e.getMessage());
        }
    }
    
    @Override
    public PaymentCallbackResult verifyCallback(Map<String, String> params) {
        log.info("OwnGateway: Verifying callback");
        
        // TODO: Implement your callback verification
        // 1. Verify signature/HMAC
        // 2. Check transaction status
        // 3. Return normalized result
        
        String transactionId = params.get("transactionId");
        String orderId = params.get("orderId");
        String amountStr = params.get("amount");
        
        return PaymentCallbackResult.builder()
                .success(true)
                .signatureValid(true)
                .statusCode(PaymentCallbackResult.PaymentStatusCode.SUCCESS)
                .transactionId(transactionId)
                .orderId(orderId)
                .amount(new BigDecimal(amountStr))
                .message("Payment verified")
                .build();
    }
    
    @Override
    public RefundResult processRefund(RefundRequest request) {
        log.info("OwnGateway: Processing refund for {}", request.getOriginalTransactionId());
        
        // TODO: Implement your refund logic
        
        return RefundResult.success(
                "OWN_REFUND_" + System.currentTimeMillis(),
                request.getRefundAmount()
        );
    }
    
    @Override
    public boolean supportsRefund() {
        return true;
    }
}
```

### Bước 2: Thêm Configuration

```yaml
# application.yml
payment:
  # Đổi default gateway sang hệ thống tự thân
  default-gateway: OWN_SYSTEM
  
  # Cấu hình hệ thống tự thân
  own-system:
    enabled: true
    api-url: https://your-payment-api.com
    api-key: ${OWN_PAYMENT_API_KEY}
```

### Bước 3: Thêm Callback Endpoint (nếu cần)

```java
// PaymentCallbackController.java - Thêm endpoint mới

@PostMapping("/own")
public ResponseEntity<Map<String, Object>> ownPaymentCallback(
        @RequestBody Map<String, Object> body) {
    log.info("Own payment callback received");
    
    Map<String, String> params = convertToStringMap(body);
    PaymentCallbackResult result = gatewayFactory
            .getGateway("OWN_SYSTEM")
            .verifyCallback(params);
    
    if (result.isSuccess()) {
        paymentService.processGatewayCallback("OWN_SYSTEM", result);
    }
    
    Map<String, Object> response = new HashMap<>();
    response.put("success", result.isSuccess());
    response.put("message", result.getMessage());
    
    return ResponseEntity.ok(response);
}
```

---

## 🔧 Checklist Triển khai

### Required Steps
- [ ] Tạo file `OwnPaymentGateway.java` implement `PaymentGateway`
- [ ] Implement `createPaymentUrl()` - tạo URL/session thanh toán
- [ ] Implement `verifyCallback()` - xác thực callback từ hệ thống
- [ ] Thêm config trong `application.yml`
- [ ] Set `payment.default-gateway: OWN_SYSTEM`
- [ ] Thêm callback endpoint (nếu dùng async)

### Optional Steps
- [ ] Implement `processRefund()` nếu hỗ trợ hoàn tiền
- [ ] Implement `queryTransaction()` để tra cứu trạng thái
- [ ] Thêm health check cho isAvailable()
- [ ] Viết unit tests

---

## 📁 File Structure

```
api/src/main/java/com/example/lms/payment/gateway/
├── PaymentGateway.java           # Interface (KHÔNG SỬA)
├── PaymentGatewayFactory.java    # Factory (KHÔNG SỬA)
├── dto/                          # DTOs (KHÔNG SỬA)
│   ├── PaymentRequest.java
│   ├── PaymentUrlResult.java
│   ├── PaymentCallbackResult.java
│   ├── RefundRequest.java
│   └── RefundResult.java
├── exception/
│   └── PaymentGatewayException.java
├── simulated/
│   └── SimulatedGateway.java     
├── vnpay/
│   └── VNPayGateway.java
└── own/                          # 🆕 THƯ MỤC MỚI
    └── OwnPaymentGateway.java    # 🆕 IMPLEMENT MỚI
```

---

## 🎯 Key Interface Methods

### PaymentGateway Interface

| Method | Bắt buộc | Mô tả |
|--------|----------|-------|
| `getGatewayCode()` | ✅ | Trả về code (e.g., "OWN_SYSTEM") |
| `getDisplayName()` | ✅ | Tên hiển thị |
| `isAvailable()` | ✅ | Kiểm tra gateway có hoạt động |
| `createPaymentUrl()` | ✅ | Tạo payment session/URL |
| `verifyCallback()` | ✅ | Xác thực callback |
| `processRefund()` | ⚪ | Xử lý hoàn tiền |
| `queryTransaction()` | ⚪ | Tra cứu trạng thái |
| `supportsRefund()` | ⚪ | Có hỗ trợ refund? |
| `getMinAmount()` | ⚪ | Số tiền tối thiểu |
| `getMaxAmount()` | ⚪ | Số tiền tối đa |

### PaymentRequest Fields

```java
PaymentRequest.builder()
    .orderId("uuid")           // ID thanh toán nội bộ
    .amount(BigDecimal)        // Số tiền
    .orderInfo("description")  // Mô tả
    .ipAddress("127.0.0.1")    // IP khách hàng
    .returnUrl("https://...")  // URL redirect sau thanh toán
    .customerEmail("...")      // Email khách
    .customerName("...")       // Tên khách
    .courseId(UUID)            // ID khóa học (LMS specific)
    .studentId(UUID)           // ID học viên (LMS specific)
    .build();
```

### PaymentUrlResult Options

```java
// Instant complete (không cần redirect)
return PaymentUrlResult.builder()
    .success(true)
    .instantComplete(true)
    .transactionId("TXN123")
    .build();

// Redirect-based (như VNPay)
return PaymentUrlResult.builder()
    .success(true)
    .paymentUrl("https://your-payment-page.com/pay/123")
    .gatewayOrderId("ORDER123")
    .expiresAt(Instant.now().plusMinutes(15))
    .build();

// QR Code based
return PaymentUrlResult.builder()
    .success(true)
    .qrCodeData("00020101021...")
    .gatewayOrderId("ORDER123")
    .build();
```

---

## 🔐 Security Considerations

1. **Signature Verification**: Luôn verify HMAC/signature trong `verifyCallback()`
2. **Amount Verification**: So sánh amount trong callback với amount gốc
3. **Idempotency**: Xử lý duplicate callback (kiểm tra status trước khi update)
4. **HTTPS**: Tất cả API calls phải qua HTTPS
5. **Secrets**: Lưu API keys trong environment variables, không hardcode

---

## 📞 Support

Nếu cần hỗ trợ thêm về:
- Banking API integration
- PCI DSS compliance
- Transaction reconciliation
- Fraud detection

Hãy liên hệ team development.

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-25 | Initial documentation |
