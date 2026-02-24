package com.example.lms.shared.application.port;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * Port for payment gateway integration.
 */
public interface PaymentGatewayPort {

    String createPaymentUrl(UUID txnId, BigDecimal amount, String orderInfo, String ipAddress);

    boolean verifyCallback(Map<String, String> params);
}
