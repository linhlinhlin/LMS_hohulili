package com.example.lms.ai_assistant.infrastructure.wiii;

import com.example.lms.shared.integration.WiiiIntegrationConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import java.util.Optional;

/**
 * Adapter: exchanges LMS user identity for a Wiii AI JWT token pair.
 *
 * <p>Flow:
 * <ol>
 *   <li>LMS user navigates to AI chat
 *   <li>LMS backend calls this adapter with user info
 *   <li>Adapter signs request body with HMAC-SHA256
 *   <li>POSTs to Wiii {@code /api/v1/auth/lms/token}
 *   <li>Wiii validates HMAC, finds/creates user, returns JWT pair
 *   <li>LMS frontend uses the Wiii JWT for direct AI chat
 * </ol>
 *
 * <p>Matches Wiii's {@code lms_token_exchange.py} HMAC validation.
 */
@Service
public class WiiiTokenExchangeAdapter {

    private static final Logger log = LoggerFactory.getLogger(WiiiTokenExchangeAdapter.class);
    private static final String HMAC_ALGO = "HmacSHA256";
    private static final String CONNECTOR_ID = "maritime-lms";
    private static final String ORG_ID = "maritime-lms";

    private final WiiiIntegrationConfig config;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public WiiiTokenExchangeAdapter(WiiiIntegrationConfig config, ObjectMapper objectMapper) {
        this.config = config;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * Exchange LMS user credentials for a Wiii JWT token pair.
     *
     * @param lmsUserId LMS user UUID as string
     * @param email     User email
     * @param fullName  User display name
     * @param role      LMS role: STUDENT, TEACHER, ADMIN, ORG_ADMIN
     * @return TokenPair with access_token and refresh_token, or empty on failure
     */
    public Optional<TokenPair> exchangeToken(String lmsUserId, String email,
                                              String fullName, String role) {
        String url = config.getTokenExchange().getUrl();
        String secret = config.getWebhook().getSecret();

        if (secret == null || secret.isBlank()) {
            log.error("Wiii webhook secret not configured — cannot sign token exchange");
            return Optional.empty();
        }

        try {
            // Map LMS role to Wiii role
            String wiiiRole = mapRole(role);

            Map<String, Object> body = Map.of(
                    "connector_id", CONNECTOR_ID,
                    "lms_user_id", lmsUserId,
                    "email", email,
                    "name", fullName,
                    "role", wiiiRole,
                    "organization_id", ORG_ID,
                    "timestamp", Instant.now().getEpochSecond()
            );

            String jsonBody = objectMapper.writeValueAsString(body);
            byte[] bodyBytes = jsonBody.getBytes(StandardCharsets.UTF_8);
            String signature = computeHmac(bodyBytes, secret);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/json")
                    .header("X-LMS-Signature", signature)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(bodyBytes))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode json = objectMapper.readTree(response.body());
                String accessToken = json.path("access_token").asText();
                String refreshToken = json.path("refresh_token").asText();

                if (!accessToken.isBlank()) {
                    log.info("Wiii token exchange success: user={}", lmsUserId);
                    return Optional.of(new TokenPair(accessToken, refreshToken));
                }
            }

            log.warn("Wiii token exchange failed: status={}, body={}",
                    response.statusCode(), response.body());

        } catch (Exception e) {
            log.error("Wiii token exchange error: {}", e.getMessage());
        }

        return Optional.empty();
    }

    /**
     * Map LMS Role enum name to Wiii role string.
     */
    private String mapRole(String lmsRole) {
        if (lmsRole == null) return "student";
        return switch (lmsRole.toUpperCase()) {
            case "TEACHER" -> "teacher";
            case "ADMIN", "ORG_ADMIN" -> "admin";
            default -> "student";
        };
    }

    private String computeHmac(byte[] payload, String secret) {
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
            throw new RuntimeException("HMAC computation failed", e);
        }
    }

    /**
     * JWT token pair returned by Wiii.
     */
    public record TokenPair(String accessToken, String refreshToken) {}
}
