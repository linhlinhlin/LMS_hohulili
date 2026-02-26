package com.example.lms.shared.infrastructure.vnpay;

import jakarta.servlet.http.HttpServletRequest;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * VNPay HMAC-SHA512 utilities.
 *
 * CRITICAL: VNPay computes hash on RAW (non-encoded) values joined as
 * "key1=value1&key2=value2" (sorted alphabetically). The URL query string
 * uses URLEncoder separately. Hash and URL encoding are independent operations.
 *
 * Reference: VNPay official Java sample code (vnpay_java)
 */
public final class VnPayUtil {

    private VnPayUtil() {}

    public static String hmacSHA512(String key, String data) {
        try {
            Mac hmac = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            hmac.init(secretKey);
            byte[] hash = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("HMAC-SHA512 computation failed", e);
        }
    }

    /**
     * Compute HMAC-SHA512 hash of fields using RAW (non-encoded) values.
     * This matches VNPay's official hash algorithm:
     * 1. Sort fields alphabetically by key
     * 2. Join as "key1=value1&key2=value2" (RAW values, NO URL encoding)
     * 3. HMAC-SHA512 with merchant's hash secret
     *
     * The URL query string encoding is handled separately in VnPayGatewayAdapter.
     */
    public static String hashAllFields(Map<String, String> fields, String secret) {
        List<String> fieldNames = new ArrayList<>(fields.keySet());
        Collections.sort(fieldNames);

        StringBuilder sb = new StringBuilder();
        boolean hasAppended = false;
        for (String name : fieldNames) {
            String value = fields.get(name);
            if (value != null && !value.isEmpty()) {
                if (hasAppended) sb.append('&');
                sb.append(name).append('=').append(value);
                hasAppended = true;
            }
        }
        return hmacSHA512(secret, sb.toString());
    }

    public static String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
            return ip.split(",")[0].trim();
        }
        ip = request.getHeader("X-Real-IP");
        if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
            return ip;
        }
        return request.getRemoteAddr();
    }
}
