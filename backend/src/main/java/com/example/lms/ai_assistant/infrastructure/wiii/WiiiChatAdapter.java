package com.example.lms.ai_assistant.infrastructure.wiii;

import com.example.lms.ai_assistant.application.port.AiChatService;
import com.example.lms.shared.integration.WiiiIntegrationConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Wiii AI chat adapter — implements {@link AiChatService}.
 *
 * <p>Proxies chat requests to Wiii AI for real AI responses.
 * Handles both synchronous chat and SSE streaming.
 *
 * <p>Token lifecycle:
 * <ol>
 *   <li>First request per user → exchange LMS identity for Wiii JWT
 *   <li>Cache Wiii JWT in memory (max 14 min, Wiii JWT expires at 15 min)
 *   <li>On 401 from Wiii → re-exchange and retry once
 * </ol>
 */
@Service
public class WiiiChatAdapter implements AiChatService {

    private static final Logger log = LoggerFactory.getLogger(WiiiChatAdapter.class);
    private static final long TOKEN_CACHE_TTL_MS = 14 * 60 * 1000L; // 14 minutes

    private final WiiiIntegrationConfig config;
    private final WiiiTokenExchangeAdapter tokenExchangeAdapter;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final ExecutorService sseExecutor;

    /** userId → CachedToken */
    private final ConcurrentHashMap<String, CachedToken> tokenCache = new ConcurrentHashMap<>();

    public WiiiChatAdapter(WiiiIntegrationConfig config,
                           WiiiTokenExchangeAdapter tokenExchangeAdapter,
                           ObjectMapper objectMapper) {
        this.config = config;
        this.tokenExchangeAdapter = tokenExchangeAdapter;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)  // Uvicorn doesn't support h2c
                .connectTimeout(Duration.ofSeconds(15))
                .build();
        this.sseExecutor = Executors.newVirtualThreadPerTaskExecutor();
    }

    @Override
    public Optional<String> chat(String userId, String email, String fullName,
                                  String role, String message,
                                  String sessionId, String domainId) {
        Optional<String> token = getOrExchangeToken(userId, email, fullName, role);
        if (token.isEmpty()) {
            return Optional.empty();
        }

        try {
            String wiiiBaseUrl = extractBaseUrl();
            String url = wiiiBaseUrl + "/api/v1/chat";

            Map<String, Object> body = buildChatBody(message, userId, sessionId, domainId, role);
            String jsonBody = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(90))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + token.get())
                    .header("X-API-Key", config.getServiceToken())
                    .header("X-User-ID", userId)
                    .header("X-Session-ID", sessionId != null ? sessionId : "default")
                    .header("X-Role", mapRoleForWiii(role))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                var json = objectMapper.readTree(response.body());
                String aiResponse = json.path("response").asText(
                        json.path("data").path("response").asText(""));
                return Optional.of(aiResponse);
            }

            // Token expired? Re-exchange and retry once
            if (response.statusCode() == 401) {
                tokenCache.remove(userId);
                token = getOrExchangeToken(userId, email, fullName, role);
                if (token.isPresent()) {
                    request = HttpRequest.newBuilder(request, (k, v) -> true)
                            .header("Authorization", "Bearer " + token.get())
                            .build();
                    response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                    if (response.statusCode() == 200) {
                        var json2 = objectMapper.readTree(response.body());
                        return Optional.of(json2.path("response").asText(
                                json2.path("data").path("response").asText("")));
                    }
                }
            }

            log.warn("Wiii chat failed: status={}", response.statusCode());

        } catch (Exception e) {
            log.error("Wiii chat error: {}", e.getMessage());
        }

        return Optional.empty();
    }

    @Override
    public SseEmitter streamChat(String userId, String email, String fullName,
                                  String role, String message,
                                  String sessionId, String domainId) {
        SseEmitter emitter = new SseEmitter(180_000L); // 3 minute timeout (maritime latency)

        sseExecutor.submit(() -> {
            try {
                // Token acquisition with exponential backoff (3 retries)
                Optional<String> token = getTokenWithRetry(userId, email, fullName, role, 3);
                if (token.isEmpty()) {
                    emitter.send(SseEmitter.event()
                            .name("error")
                            .data("{\"message\":\"Không thể kết nối với AI service\"}"));
                    emitter.complete();
                    return;
                }

                String wiiiBaseUrl = extractBaseUrl();
                String url = wiiiBaseUrl + "/api/v1/chat/stream/v3";

                Map<String, Object> body = buildChatBody(message, userId, sessionId, domainId, role);
                String jsonBody = objectMapper.writeValueAsString(body);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .timeout(Duration.ofSeconds(180))
                        .header("Content-Type", "application/json")
                        .header("Accept", "text/event-stream")
                        .header("Authorization", "Bearer " + token.get())
                        .header("X-API-Key", config.getServiceToken())
                        .header("X-User-ID", userId)
                        .header("X-Session-ID", sessionId != null ? sessionId : "default")
                        .header("X-Role", mapRoleForWiii(role))
                        .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                        .build();

                HttpResponse<java.io.InputStream> response = httpClient.send(
                        request, HttpResponse.BodyHandlers.ofInputStream());

                // On 401, retry with fresh token
                if (response.statusCode() == 401) {
                    tokenCache.remove(userId);
                    token = getTokenWithRetry(userId, email, fullName, role, 2);
                    if (token.isPresent()) {
                        request = HttpRequest.newBuilder()
                                .uri(URI.create(url))
                                .timeout(Duration.ofSeconds(180))
                                .header("Content-Type", "application/json")
                                .header("Accept", "text/event-stream")
                                .header("Authorization", "Bearer " + token.get())
                                .header("X-API-Key", config.getServiceToken())
                                .header("X-User-ID", userId)
                                .header("X-Session-ID", sessionId != null ? sessionId : "default")
                                .header("X-Role", mapRoleForWiii(role))
                                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                                .build();
                        response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
                    }
                }

                if (response.statusCode() != 200) {
                    emitter.send(SseEmitter.event()
                            .name("error")
                            .data("{\"message\":\"AI service trả về lỗi " + response.statusCode() + "\"}"));
                    emitter.complete();
                    return;
                }

                // Forward SSE events from Wiii to client with heartbeat
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {

                    String eventName = null;
                    StringBuilder dataBuffer = new StringBuilder();
                    long lastEventTime = System.currentTimeMillis();

                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (line.startsWith("event: ")) {
                            eventName = line.substring(7).trim();
                        } else if (line.startsWith("data: ")) {
                            dataBuffer.append(line.substring(6));
                        } else if (line.isEmpty() && eventName != null) {
                            String data = dataBuffer.toString();
                            try {
                                emitter.send(SseEmitter.event()
                                        .name(eventName)
                                        .data(data));
                                lastEventTime = System.currentTimeMillis();
                            } catch (Exception e) {
                                break; // Client disconnected
                            }

                            if ("done".equals(eventName)) {
                                break;
                            }

                            eventName = null;
                            dataBuffer.setLength(0);
                        } else if (line.isEmpty()) {
                            // Send heartbeat if no event for 15 seconds
                            if (System.currentTimeMillis() - lastEventTime > 15_000) {
                                try {
                                    emitter.send(SseEmitter.event()
                                            .name("heartbeat")
                                            .data("{\"ts\":" + System.currentTimeMillis() + "}"));
                                    lastEventTime = System.currentTimeMillis();
                                } catch (Exception e) {
                                    break;
                                }
                            }
                        }
                    }
                }

                emitter.complete();

            } catch (Exception e) {
                log.error("SSE streaming error: {}", e.getMessage());
                try {
                    emitter.send(SseEmitter.event()
                            .name("error")
                            .data("{\"message\":\"Lỗi kết nối AI: " + e.getMessage() + "\"}"));
                    emitter.complete();
                } catch (Exception ignored) {
                    // Client already disconnected
                }
            }
        });

        return emitter;
    }

    /**
     * Get token with exponential backoff retry.
     */
    private Optional<String> getTokenWithRetry(String userId, String email,
                                                 String fullName, String role,
                                                 int maxRetries) {
        for (int attempt = 0; attempt <= maxRetries; attempt++) {
            Optional<String> token = getOrExchangeToken(userId, email, fullName, role);
            if (token.isPresent()) {
                return token;
            }
            if (attempt < maxRetries) {
                try {
                    long delay = (long) Math.pow(2, attempt) * 1000L; // 1s, 2s, 4s
                    Thread.sleep(delay);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return Optional.empty();
                }
            }
        }
        return Optional.empty();
    }

    // ============== Helpers ==============

    private Optional<String> getOrExchangeToken(String userId, String email,
                                                  String fullName, String role) {
        CachedToken cached = tokenCache.get(userId);
        if (cached != null && !cached.isExpired()) {
            return Optional.of(cached.accessToken);
        }

        Optional<WiiiTokenExchangeAdapter.TokenPair> pair =
                tokenExchangeAdapter.exchangeToken(userId, email, fullName, role);
        if (pair.isPresent()) {
            tokenCache.put(userId, new CachedToken(
                    pair.get().accessToken(), System.currentTimeMillis()));
            return Optional.of(pair.get().accessToken());
        }

        return Optional.empty();
    }

    private Map<String, Object> buildChatBody(String message, String userId,
                                                String sessionId, String domainId,
                                                String role) {
        var bodyBuilder = new java.util.HashMap<String, Object>();
        bodyBuilder.put("message", message);
        bodyBuilder.put("user_id", userId);
        bodyBuilder.put("domain_id", domainId != null ? domainId : "maritime");
        bodyBuilder.put("role", mapRoleForWiii(role));
        if (sessionId != null) {
            bodyBuilder.put("session_id", sessionId);
        }
        return bodyBuilder;
    }

    private String mapRoleForWiii(String lmsRole) {
        if (lmsRole == null) return "student";
        return switch (lmsRole.toUpperCase()) {
            case "TEACHER" -> "teacher";
            case "ADMIN", "ORG_ADMIN" -> "admin";
            default -> "student";
        };
    }

    /**
     * Extract Wiii base URL from token exchange URL.
     * e.g. "http://localhost:8000/api/v1/auth/lms/token" → "http://localhost:8000"
     */
    private String extractBaseUrl() {
        String tokenUrl = config.getTokenExchange().getUrl();
        try {
            URI uri = URI.create(tokenUrl);
            return uri.getScheme() + "://" + uri.getAuthority();
        } catch (Exception e) {
            return "http://localhost:8000";
        }
    }

    private record CachedToken(String accessToken, long createdAt) {
        boolean isExpired() {
            return System.currentTimeMillis() - createdAt > TOKEN_CACHE_TTL_MS;
        }
    }
}
