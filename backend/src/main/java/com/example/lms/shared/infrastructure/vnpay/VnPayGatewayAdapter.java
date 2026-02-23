package com.example.lms.shared.infrastructure.vnpay;

import com.example.lms.shared.application.port.PaymentGatewayPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class VnPayGatewayAdapter implements PaymentGatewayPort {

    private final VnPayConfig config;

    @Override
    public String createPaymentUrl(UUID txnId, BigDecimal amount, String orderInfo, String ipAddress) {
        Map<String, String> params = new TreeMap<>();

        SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMddHHmmss");
        sdf.setTimeZone(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        String createDate = sdf.format(new Date());

        Calendar expireCal = Calendar.getInstance(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        expireCal.add(Calendar.MINUTE, config.getExpireMinutes());
        String expireDate = sdf.format(expireCal.getTime());

        // VNPay amount = actual amount × 100 (no decimals)
        long vnpAmount = amount.multiply(BigDecimal.valueOf(100)).longValue();

        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", config.getTmnCode());
        params.put("vnp_Amount", String.valueOf(vnpAmount));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", txnId.toString());
        params.put("vnp_OrderInfo", removeDiacritics(orderInfo));
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", config.getReturnUrl());
        params.put("vnp_IpAddr", ipAddress);
        params.put("vnp_CreateDate", createDate);
        params.put("vnp_ExpireDate", expireDate);

        // Build query string (sorted alphabetically by TreeMap)
        StringBuilder query = new StringBuilder();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (!query.isEmpty()) query.append('&');
            query.append(URLEncoder.encode(entry.getKey(), StandardCharsets.US_ASCII))
                 .append('=')
                 .append(URLEncoder.encode(entry.getValue(), StandardCharsets.US_ASCII));
        }

        // Compute HMAC-SHA512
        String secureHash = VnPayUtil.hashAllFields(params, config.getHashSecret());
        query.append("&vnp_SecureHash=").append(secureHash);

        String paymentUrl = config.getPayUrl() + "?" + query;
        log.info("[VNPay] Created payment URL for txn: {}", txnId);
        return paymentUrl;
    }

    @Override
    public boolean verifyCallback(Map<String, String> params) {
        String receivedHash = params.get("vnp_SecureHash");
        if (receivedHash == null || receivedHash.isEmpty()) {
            return false;
        }

        // Remove hash fields before computing
        Map<String, String> fieldsForHash = new TreeMap<>(params);
        fieldsForHash.remove("vnp_SecureHash");
        fieldsForHash.remove("vnp_SecureHashType");

        String computedHash = VnPayUtil.hashAllFields(fieldsForHash, config.getHashSecret());
        return computedHash.equalsIgnoreCase(receivedHash);
    }

    private static String removeDiacritics(String input) {
        if (input == null) return "";
        return java.text.Normalizer.normalize(input, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replaceAll("đ", "d").replaceAll("Đ", "D");
    }
}
