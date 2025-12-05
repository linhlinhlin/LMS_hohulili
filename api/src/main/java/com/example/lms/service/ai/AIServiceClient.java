package com.example.lms.service.ai;

import com.example.lms.config.AIServiceConfig;
import com.example.lms.dto.ai.external.*;
import com.example.lms.service.ai.exception.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * HTTP Client gọi AI Service (Maritime AI Chatbot).
 * Xử lý authentication, timeout, và error handling.
 */
@Component
public class AIServiceClient {
    
    private static final Logger log = LoggerFactory.getLogger(AIServiceClient.class);
    
    private final RestTemplate restTemplate;
    private final AIServiceConfig config;
    private final ObjectMapper objectMapper;
    
    public AIServiceClient(AIServiceConfig config, ObjectMapper objectMapper, 
                          RestTemplateBuilder restTemplateBuilder) {
        this.config = config;
        this.objectMapper = objectMapper;
        this.restTemplate = createRestTemplate(restTemplateBuilder);
    }
    
    private RestTemplate createRestTemplate(RestTemplateBuilder builder) {
        int timeoutSeconds = config.getTimeout() > 0 ? config.getTimeout() : 90;
        return builder
            .connectTimeout(Duration.ofSeconds(30))
            .readTimeout(Duration.ofSeconds(timeoutSeconds))
            .build();
    }
    
    /**
     * Gọi chat endpoint của AI Service
     */
    public AIServiceResponse chat(AIServiceRequest request) {
        String url = config.getUrl() + "/api/v1/chat";
        
        log.info("Calling AI Service chat: url={}, userId={}, sessionId={}", 
            url, request.userId(), request.sessionId());
        long startTime = System.currentTimeMillis();

        try {
            HttpHeaders headers = createHeaders();
            HttpEntity<AIServiceRequest> entity = new HttpEntity<>(request, headers);
            
            log.debug("Sending request to AI Service...");
            ResponseEntity<AIServiceResponse> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                AIServiceResponse.class
            );
            
            long duration = System.currentTimeMillis() - startTime;
            log.info("AI Service responded in {}ms, status={}", duration, response.getStatusCode());
            
            AIServiceResponse body = response.getBody();
            if (body != null) {
                log.debug("AI Response: status={}, hasData={}", 
                    body.status(), body.data() != null);
            }
            
            return body;
            
        } catch (ResourceAccessException e) {
            log.error("AI Service connection error: {}", e.getMessage());
            if (e.getMessage() != null && e.getMessage().contains("timeout")) {
                throw new AIServiceTimeoutException(
                    "AI Service timeout after " + config.getTimeout() + "s");
            }
            throw new AIServiceUnavailableException("AI Service không khả dụng: " + e.getMessage());
            
        } catch (HttpClientErrorException e) {
            handleClientError(e);
            throw new AIServiceException("Unexpected client error", e.getStatusCode().value());
            
        } catch (HttpServerErrorException e) {
            log.error("AI Service server error: {} - {}", 
                e.getStatusCode(), e.getResponseBodyAsString());
            throw new AIServiceUnavailableException("AI Service gặp lỗi server");
            
        } catch (AIServiceException e) {
            throw e; // Re-throw our custom exceptions
            
        } catch (Exception e) {
            log.error("Unexpected error calling AI Service", e);
            throw new AIServiceException("Lỗi không xác định: " + e.getMessage(), 500);
        }
    }
    
    /**
     * Gọi health endpoint của AI Service
     * Note: AI Service health endpoint is /health (NOT /api/v1/health)
     */
    public AIHealthResponse health() {
        String url = config.getUrl() + "/health";
        
        try {
            HttpHeaders headers = createHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            ResponseEntity<AIHealthResponse> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                AIHealthResponse.class
            );
            
            return response.getBody();
            
        } catch (Exception e) {
            log.warn("AI Service health check failed: {}", e.getMessage());
            return null;
        }
    }

    
    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-API-Key", config.getApiKey());
        return headers;
    }
    
    private void handleClientError(HttpClientErrorException e) {
        int statusCode = e.getStatusCode().value();
        String body = e.getResponseBodyAsString();
        
        log.warn("AI Service client error: {} - {}", statusCode, body);
        
        if (statusCode == 429) {
            // Rate limit
            try {
                AIErrorResponse errorResponse = objectMapper.readValue(body, AIErrorResponse.class);
                int retryAfter = errorResponse.retryAfter() != null ? errorResponse.retryAfter() : 60;
                throw new AIServiceRateLimitException("Rate limit exceeded", retryAfter);
            } catch (AIServiceRateLimitException ex) {
                throw ex;
            } catch (Exception ex) {
                throw new AIServiceRateLimitException("Rate limit exceeded", 60);
            }
        }
        
        if (statusCode == 401) {
            throw new AIServiceException("Invalid API Key", 401);
        }
        
        if (statusCode == 400) {
            throw new AIServiceException("Invalid request: " + body, 400);
        }
    }
}
