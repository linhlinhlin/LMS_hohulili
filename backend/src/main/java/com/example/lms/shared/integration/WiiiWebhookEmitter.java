package com.example.lms.shared.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;

/**
 * Async webhook emitter to Wiii AI service.
 *
 * <p>Sends HMAC-SHA256 signed webhook events when LMS domain events occur.
 * Operates fire-and-forget — LMS flow is never blocked by webhook failures.
 *
 * <p>HMAC format: {@code sha256=<hex>} in {@code X-LMS-Signature} header.
 * This matches Wiii's {@code verify_hmac_sha256()} in {@code base.py}.
 */
@Service
public class WiiiWebhookEmitter {

    private static final Logger log = LoggerFactory.getLogger(WiiiWebhookEmitter.class);
    private static final String HMAC_ALGO = "HmacSHA256";

    private final WiiiIntegrationConfig config;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public WiiiWebhookEmitter(WiiiIntegrationConfig config, ObjectMapper objectMapper) {
        this.config = config;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    /**
     * Send a webhook event to Wiii asynchronously.
     *
     * @param eventType One of: grade_saved, course_enrolled, assignment_submitted,
     *                  quiz_completed, attendance_marked
     * @param payload   Event-specific payload map
     */
    @Async
    public void sendEvent(String eventType, Map<String, Object> payload) {
        if (!config.getWebhook().isEnabled()) {
            log.debug("Wiii webhook disabled, skipping event: {}", eventType);
            return;
        }

        String url = config.getWebhook().getUrl();
        String secret = config.getWebhook().getSecret();
        int timeout = config.getWebhook().getTimeout();
        int maxRetries = config.getWebhook().getRetryMax();

        Map<String, Object> body = Map.of(
                "event_type", eventType,
                "timestamp", Instant.now().toString(),
                "payload", payload
        );

        for (int attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                String jsonBody = objectMapper.writeValueAsString(body);
                byte[] bodyBytes = jsonBody.getBytes(StandardCharsets.UTF_8);
                String signature = computeHmac(bodyBytes, secret);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .timeout(Duration.ofSeconds(timeout))
                        .header("Content-Type", "application/json")
                        .header("X-LMS-Signature", signature)
                        .POST(HttpRequest.BodyPublishers.ofByteArray(bodyBytes))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() >= 200 && response.statusCode() < 300) {
                    log.info("Wiii webhook sent: {} (status={})", eventType, response.statusCode());
                    return;
                }

                log.warn("Wiii webhook failed: {} (status={}, attempt={}/{})",
                        eventType, response.statusCode(), attempt + 1, maxRetries + 1);

            } catch (Exception e) {
                log.warn("Wiii webhook error: {} (attempt={}/{}, error={})",
                        eventType, attempt + 1, maxRetries + 1, e.getMessage());
            }

            // Exponential backoff between retries
            if (attempt < maxRetries) {
                try {
                    Thread.sleep((long) Math.pow(2, attempt) * 1000);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }

        log.error("Wiii webhook exhausted retries: {} (url={})", eventType, url);
    }

    /**
     * Compute HMAC-SHA256 signature matching Wiii's verify_hmac_sha256().
     *
     * @return Signature in format {@code sha256=<hex>}
     */
    private String computeHmac(byte[] payload, String secret) {
        if (secret == null || secret.isBlank()) {
            return "";
        }
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            SecretKeySpec keySpec = new SecretKeySpec(
                    secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGO);
            mac.init(keySpec);
            byte[] hash = mac.doFinal(payload);
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return "sha256=" + hex;
        } catch (Exception e) {
            log.error("HMAC computation failed", e);
            return "";
        }
    }
}
