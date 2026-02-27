package com.example.lms.shared.infrastructure.vnpay;

import jakarta.servlet.http.HttpServletRequest;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
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
     * Compute HMAC-SHA512 hash of fields using URL-encoded values.
     * This matches VNPay's official hash algorithm:
     * 1. Sort fields alphabetically by key
     * 2. Join as "key1=URLEncode(value1)&key2=URLEncode(value2)"
     * 3. HMAC-SHA512 with merchant's hash secret
     *
     * Reference: VNPay official Java sample (vnpay_java) uses URLEncoder.encode()
     * on values before building hash data string.
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
                sb.append(URLEncoder.encode(name, StandardCharsets.US_ASCII))
                  .append('=')
                  .append(URLEncoder.encode(value, StandardCharsets.US_ASCII));
                hasAppended = true;
            }
        }
        return hmacSHA512(secret, sb.toString());
    }

    /**
     * Extract client IP from X-Forwarded-For header.
     * Uses the RIGHTMOST IP (added by Caddy/nginx reverse proxy) to prevent spoofing.
     * The leftmost IP is client-controlled and can be forged.
     */
    public static String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            String[] ips = xForwardedFor.split(",");
            for (int i = ips.length - 1; i >= 0; i--) {
                String ip = ips[i].trim();
                if (!ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
                    return ip;
                }
            }
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isEmpty() && !"unknown".equalsIgnoreCase(realIp)) {
            return realIp;
        }
        return request.getRemoteAddr();
    }
}
