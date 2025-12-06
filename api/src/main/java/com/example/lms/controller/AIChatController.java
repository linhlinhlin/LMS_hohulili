package com.example.lms.controller;

import com.example.lms.dto.ai.*;
import com.example.lms.entity.User;
import com.example.lms.service.ai.AIChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST Controller cho AI Chat endpoints.
 * Proxy giữa Frontend và AI Service.
 * 
 * Tất cả endpoints yêu cầu authentication (trừ /health và /ping).
 */
@RestController
@RequestMapping("/api/v1/ai")
@Tag(name = "AI Chat", description = "API cho AI Chatbot")
public class AIChatController {
    
    private static final Logger log = LoggerFactory.getLogger(AIChatController.class);
    
    private final AIChatService aiChatService;
    
    public AIChatController(AIChatService aiChatService) {
        this.aiChatService = aiChatService;
    }
    
    /**
     * Gửi tin nhắn đến AI và nhận response
     * Yêu cầu authentication
     */
    @PostMapping("/chat")
    @Operation(summary = "Gửi tin nhắn đến AI Chatbot")
    @SecurityRequirement(name = "Bearer Authentication")
    public ResponseEntity<ChatResponseDTO> chat(
            @Valid @RequestBody ChatRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        log.info("AI Chat request from user: {}, message: {}", 
            currentUser.getEmail(), request.message());
        ChatResponseDTO response = aiChatService.sendMessage(currentUser, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Lấy danh sách chat sessions của user
     * Yêu cầu authentication
     */
    @GetMapping("/sessions")
    @Operation(summary = "Lấy danh sách lịch sử chat")
    @SecurityRequirement(name = "Bearer Authentication")
    public ResponseEntity<Page<ChatSessionDTO>> getSessions(
            @AuthenticationPrincipal User currentUser,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        log.debug("Get sessions for user: {}", currentUser.getEmail());
        Page<ChatSessionDTO> sessions = aiChatService.getUserSessions(currentUser, pageable);
        return ResponseEntity.ok(sessions);
    }
    
    /**
     * Lấy chi tiết một session với tất cả messages
     * Yêu cầu authentication
     */
    @GetMapping("/sessions/{id}")
    @Operation(summary = "Lấy chi tiết session chat")
    @SecurityRequirement(name = "Bearer Authentication")
    public ResponseEntity<ChatSessionDetailDTO> getSession(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        log.debug("Get session {} for user: {}", id, currentUser.getEmail());
        ChatSessionDetailDTO session = aiChatService.getSessionDetail(currentUser, id);
        return ResponseEntity.ok(session);
    }
    
    /**
     * Xóa (soft delete) một session
     * Yêu cầu authentication
     */
    @DeleteMapping("/sessions/{id}")
    @Operation(summary = "Xóa session chat")
    @SecurityRequirement(name = "Bearer Authentication")
    public ResponseEntity<Void> deleteSession(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        log.info("Delete session {} for user: {}", id, currentUser.getEmail());
        aiChatService.deleteSession(currentUser, id);
        return ResponseEntity.noContent().build();
    }
    
    /**
     * Health check endpoint - PUBLIC (không cần authentication)
     * Kiểm tra trạng thái kết nối với AI Service
     */
    @GetMapping("/health")
    @Operation(summary = "Kiểm tra trạng thái AI Service")
    public ResponseEntity<HealthStatusDTO> health() {
        try {
            HealthStatusDTO status = aiChatService.checkHealth();
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            log.error("Health check failed: {}", e.getMessage());
            return ResponseEntity.ok(HealthStatusDTO.degraded("Error: " + e.getMessage()));
        }
    }
    
    /**
     * Simple ping endpoint - PUBLIC (không cần authentication)
     * Kiểm tra LMS Backend proxy đang hoạt động
     */
    @GetMapping("/ping")
    @Operation(summary = "Simple ping endpoint")
    public ResponseEntity<java.util.Map<String, Object>> ping() {
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("status", "ok");
        response.put("timestamp", java.time.Instant.now().toString());
        response.put("service", "LMS AI Proxy");
        return ResponseEntity.ok(response);
    }
}
