package com.example.lms.service.ai;

import com.example.lms.config.AIServiceConfig;
import com.example.lms.dto.ai.external.AIServiceRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.time.Duration;

/**
 * Streaming HTTP Client for AI Service (SSE).
 * Uses WebClient for reactive streaming support.
 * 
 * Created: 11/12/2025
 * Updated: 11/12/2025 - Fixed SSE parsing for AI Service format
 */
@Component
public class AIStreamClient {
    
    private static final Logger log = LoggerFactory.getLogger(AIStreamClient.class);
    
    private final WebClient webClient;
    private final AIServiceConfig config;
    
    public AIStreamClient(AIServiceConfig config) {
        this.config = config;
        this.webClient = WebClient.builder()
            .baseUrl(config.getUrl())
            .defaultHeader("X-API-Key", config.getApiKey())
            .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
            .build();
        
        log.info("AIStreamClient initialized with URL: {}", config.getUrl());
    }
    
    /**
     * Stream chat response from AI Service using SSE.
     * Uses raw String flux and manual parsing for better compatibility.
     * 
     * Events from AI Service:
     * - thinking: AI reasoning process
     * - answer: Response chunks
     * - sources: Source citations with bounding boxes
     * - suggested_questions: Follow-up questions
     * - metadata: Processing info
     * - done: Stream completed
     * - error: Error occurred
     * 
     * @param request Chat request
     * @return Flux of SSE events
     */
    public Flux<ServerSentEvent<String>> streamChatSSE(AIServiceRequest request) {
        String url = "/api/v1/chat/stream";
        
        log.info("Starting SSE streaming chat: userId={}, message={}", 
            request.userId(), request.message().substring(0, Math.min(50, request.message().length())));
        
        // Use raw String flux for better SSE compatibility
        return webClient.post()
            .uri(url)
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.TEXT_EVENT_STREAM)
            .bodyValue(request)
            .retrieve()
            .bodyToFlux(String.class)
            .timeout(Duration.ofSeconds(config.getTimeout() > 0 ? config.getTimeout() : 120))
            .doOnNext(chunk -> log.info("Raw chunk received: {}", 
                chunk.substring(0, Math.min(100, chunk.length()))))
            .flatMap(this::parseRawSSE)
            .doOnNext(sse -> log.info("SSE event parsed: type={}, data={}", 
                sse.event(), 
                sse.data() != null ? sse.data().substring(0, Math.min(50, sse.data().length())) : "null"))
            .doOnError(e -> log.error("SSE streaming error: {}", e.getMessage()))
            .doOnComplete(() -> log.info("SSE streaming completed"));
    }
    
    /**
     * Alternative method - parse raw text stream manually
     * Use this if the ParameterizedTypeReference method doesn't work
     */
    public Flux<ServerSentEvent<String>> streamChatRaw(AIServiceRequest request) {
        String url = "/api/v1/chat/stream";
        
        log.info("Starting raw streaming chat: userId={}", request.userId());
        
        return webClient.post()
            .uri(url)
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.TEXT_EVENT_STREAM)
            .bodyValue(request)
            .retrieve()
            .bodyToFlux(String.class)
            .timeout(Duration.ofSeconds(config.getTimeout() > 0 ? config.getTimeout() : 120))
            .flatMap(this::parseRawSSE)
            .doOnNext(sse -> log.debug("Parsed SSE: type={}", sse.event()))
            .doOnError(e -> log.error("Raw streaming error: {}", e.getMessage()))
            .doOnComplete(() -> log.info("Raw streaming completed"));
    }
    
    /**
     * Parse raw SSE text lines into ServerSentEvent objects
     * Handles multiple formats:
     * 1. Standard SSE: event: xxx\ndata: {...}
     * 2. Direct JSON: {"content": "..."}
     * 3. Mixed chunks with multiple events
     */
    private Flux<ServerSentEvent<String>> parseRawSSE(String rawChunk) {
        if (rawChunk == null || rawChunk.isBlank()) {
            return Flux.empty();
        }
        
        String trimmed = rawChunk.trim();
        log.debug("Parsing raw chunk (len={}): {}", trimmed.length(), 
            trimmed.substring(0, Math.min(150, trimmed.length())));
        
        // Check if it's direct JSON (no event:/data: prefix)
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            // Direct JSON - treat as answer event
            log.debug("Direct JSON detected, treating as answer");
            return Flux.just(ServerSentEvent.<String>builder()
                .event("answer")
                .data(trimmed)
                .build());
        }
        
        // Split by double newline (SSE event separator)
        String[] events = rawChunk.split("\n\n");
        
        return Flux.fromArray(events)
            .filter(event -> event != null && !event.isBlank())
            .map(this::parseSingleEvent)
            .filter(sse -> sse != null);
    }
    
    /**
     * Parse a single SSE event block
     * Handles:
     * - event: xxx\ndata: {...}
     * - data: {...}
     * - Direct JSON
     */
    private ServerSentEvent<String> parseSingleEvent(String eventBlock) {
        if (eventBlock == null || eventBlock.isBlank()) {
            return null;
        }
        
        String trimmed = eventBlock.trim();
        
        // Direct JSON without event:/data: prefix
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            // Try to detect event type from JSON content
            String detectedType = detectEventTypeFromJson(trimmed);
            return ServerSentEvent.<String>builder()
                .event(detectedType)
                .data(trimmed)
                .build();
        }
        
        String eventType = "message";
        String data = null;
        
        String[] lines = eventBlock.split("\n");
        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty()) continue;
            
            if (line.startsWith("event:")) {
                eventType = line.substring(6).trim();
            } else if (line.startsWith("data:")) {
                data = line.substring(5).trim();
            } else if (line.startsWith("{")) {
                // Line is direct JSON
                data = line;
            }
        }
        
        // If no data found, return null
        if (data == null || data.isEmpty()) {
            log.debug("No data found in event block: {}", trimmed.substring(0, Math.min(50, trimmed.length())));
            return null;
        }
        
        // If event type is still "message", try to detect from data content
        if ("message".equals(eventType) && data != null) {
            eventType = detectEventTypeFromJson(data);
        }
        
        log.debug("Parsed event: type={}, data={}", eventType, data.substring(0, Math.min(50, data.length())));
        
        return ServerSentEvent.<String>builder()
            .event(eventType)
            .data(data)
            .build();
    }
    
    /**
     * Detect event type from JSON content
     * AI Service may send events without explicit event type
     * We detect based on content patterns
     * 
     * IMPORTANT: Status messages like "Đang phân tích..." are NOT thinking!
     * They are just status updates and should be passed as "answer" type
     * Frontend will filter them out.
     * 
     * Real thinking content starts with patterns like:
     * - "Người dùng..." (The user...)
     * - "Tôi cần..." (I need to...)
     * - "Tôi sẽ..." (I will...)
     */
    private String detectEventTypeFromJson(String json) {
        if (json == null || json.isEmpty()) {
            return "answer";
        }
        
        // Check for explicit type field in JSON
        if (json.contains("\"type\"")) {
            if (json.contains("\"type\":\"thinking\"") || json.contains("\"type\": \"thinking\"")) {
                return "thinking";
            }
            if (json.contains("\"type\":\"sources\"") || json.contains("\"type\": \"sources\"")) {
                return "sources";
            }
            if (json.contains("\"type\":\"done\"") || json.contains("\"type\": \"done\"")) {
                return "done";
            }
            // Backend AI sends done with status: complete
            if (json.contains("\"status\":\"complete\"") || json.contains("\"status\": \"complete\"")) {
                log.info("Detected done event via status:complete");
                return "done";
            }
            if (json.contains("\"type\":\"error\"") || json.contains("\"type\": \"error\"")) {
                return "error";
            }
            if (json.contains("\"type\":\"metadata\"") || json.contains("\"type\": \"metadata\"")) {
                return "metadata";
            }
            if (json.contains("\"type\":\"suggested_questions\"") || json.contains("\"type\": \"suggested_questions\"")) {
                return "suggested_questions";
            }
            if (json.contains("\"type\":\"thinking_start\"") || json.contains("\"type\": \"thinking_start\"")) {
                return "thinking_start";
            }
            if (json.contains("\"type\":\"thinking_end\"") || json.contains("\"type\": \"thinking_end\"")) {
                return "thinking_end";
            }
        }
        
        // Also check for status:complete outside of type field (direct done signal)
        if (json.contains("\"status\":\"complete\"") || json.contains("\"status\": \"complete\"")) {
            log.info("Detected done event via status:complete (no type field)");
            return "done";
        }
        
        // Empty JSON {} could be a done signal from some backends
        if (json.trim().equals("{}")) {
            log.info("Detected empty JSON {} - treating as done event");
            return "done";
        }
        
        // Check for sources array
        if (json.contains("\"sources\"") && json.contains("[")) {
            return "sources";
        }
        
        // Check for questions array
        if (json.contains("\"questions\"") && json.contains("[")) {
            return "suggested_questions";
        }
        
        // NOTE: Do NOT detect status messages as thinking!
        // Status messages like "Đang phân tích...", "Đang tra cứu..." are NOT real thinking
        // They should be passed as "answer" and frontend will filter them
        // Real thinking is detected by frontend based on content patterns
        
        // Default to answer - let frontend handle status vs thinking vs answer detection
        return "answer";
    }
}
