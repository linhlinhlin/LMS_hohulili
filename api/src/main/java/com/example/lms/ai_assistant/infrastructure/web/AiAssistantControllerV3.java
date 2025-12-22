package com.example.lms.ai_assistant.infrastructure.web;

import com.example.lms.ai_assistant.application.dto.ChatSessionResponse;
import com.example.lms.ai_assistant.application.dto.CreateChatSessionCommand;
import com.example.lms.ai_assistant.application.dto.SendChatMessageCommand;
import com.example.lms.ai_assistant.application.usecase.ChatSessionUseCaseV3;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST Controller for AI Assistant functionality.
 * 
 * Provides endpoints for:
 * - Chat session management
 * - AI-powered conversations
 */
@RestController
@RequestMapping("/api/v3/ai")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "AI Assistant", description = "AI-powered chat and assistance APIs")
@SecurityRequirement(name = "bearerAuth")
public class AiAssistantControllerV3 {

    private final ChatSessionUseCaseV3 chatSessionUseCase;

    // ============== Health Check ==============
    
    @GetMapping("/health")
    @Operation(summary = "Check AI service health status")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> health = Map.of(
            "status", "healthy",
            "aiServiceStatus", "available",
            "version", "3.0",
            "timestamp", System.currentTimeMillis()
        );
        return ResponseEntity.ok(health);
    }

    // ============== Session Management ==============

    @PostMapping("/sessions")
    @Operation(summary = "Create a new chat session")
    public ResponseEntity<ChatSessionResponse> createSession(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestBody @Valid CreateChatSessionCommand command) {
        
        log.info("Creating chat session for user: {}", user.getId());
        ChatSessionResponse response = chatSessionUseCase.createSession(user.getId(), command);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/sessions")
    @Operation(summary = "Get all chat sessions for current user")
    public ResponseEntity<List<ChatSessionResponse>> getUserSessions(
            @AuthenticationPrincipal UserJpaEntity user) {
        
        log.info("Getting sessions for user: {}", user.getId());
        List<ChatSessionResponse> sessions = chatSessionUseCase.getUserSessions(user.getId());
        return ResponseEntity.ok(sessions);
    }

    @GetMapping("/sessions/{sessionId}")
    @Operation(summary = "Get a specific chat session")
    public ResponseEntity<ChatSessionResponse> getSession(
            @PathVariable UUID sessionId) {
        
        ChatSessionResponse session = chatSessionUseCase.getSession(sessionId);
        return ResponseEntity.ok(session);
    }

    @PutMapping("/sessions/{sessionId}/archive")
    @Operation(summary = "Archive a chat session")
    public ResponseEntity<Void> archiveSession(@PathVariable UUID sessionId) {
        chatSessionUseCase.archiveSession(sessionId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/sessions/{sessionId}")
    @Operation(summary = "Delete a chat session")
    public ResponseEntity<Void> deleteSession(@PathVariable UUID sessionId) {
        chatSessionUseCase.deleteSession(sessionId);
        return ResponseEntity.noContent().build();
    }

    // ============== Chat Endpoints ==============

    @PostMapping("/sessions/{sessionId}/messages")
    @Operation(summary = "Send a message and get AI response")
    public ResponseEntity<Map<String, Object>> sendMessage(
            @PathVariable UUID sessionId,
            @RequestBody @Valid SendChatMessageCommand command) {
        
        log.info("Sending message to session: {}", sessionId);
        
        // TODO: Integrate with AI service (OpenAI, Gemini, etc.)
        // For now, return a placeholder response
        Map<String, Object> response = Map.of(
            "sessionId", sessionId,
            "userMessage", command.content(),
            "aiResponse", "Xin chào! Tôi là trợ lý AI của hệ thống LMS Maritime. " +
                         "Tính năng AI đang được phát triển. Vui lòng quay lại sau!",
            "status", "pending_integration"
        );
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/chat")
    @Operation(summary = "Quick chat without session (stateless)")
    public ResponseEntity<Map<String, Object>> quickChat(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestBody @Valid SendChatMessageCommand command) {
        
        log.info("Quick chat from user: {}", user.getId());
        
        // TODO: Integrate with AI service
        Map<String, Object> response = Map.of(
            "userId", user.getId(),
            "query", command.content(),
            "response", "Xin chào " + user.getFullName() + "! " +
                       "Tính năng AI đang được phát triển. " +
                       "Hãy quay lại sau để trải nghiệm!",
            "timestamp", System.currentTimeMillis()
        );
        
        return ResponseEntity.ok(response);
    }

    // ============== Context-Aware Chat ==============

    @PostMapping("/courses/{courseId}/ask")
    @Operation(summary = "Ask AI about a specific course")
    public ResponseEntity<Map<String, Object>> askAboutCourse(
            @PathVariable UUID courseId,
            @RequestBody @Valid SendChatMessageCommand command) {
        
        log.info("Course context question for course: {}", courseId);
        
        // TODO: Integrate with AI service with course context
        Map<String, Object> response = Map.of(
            "courseId", courseId,
            "query", command.content(),
            "response", "Câu hỏi của bạn về khóa học này đang được xử lý. " +
                       "Tính năng AI theo ngữ cảnh đang được phát triển.",
            "context", "course"
        );
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/lessons/{lessonId}/explain")
    @Operation(summary = "Get AI explanation for a lesson")
    public ResponseEntity<Map<String, Object>> explainLesson(
            @PathVariable UUID lessonId,
            @RequestBody(required = false) SendChatMessageCommand command) {
        
        log.info("Lesson explanation request for lesson: {}", lessonId);
        
        String query = command != null ? command.content() : "Giải thích bài học này";
        
        // TODO: Integrate with AI service with lesson context
        Map<String, Object> response = Map.of(
            "lessonId", lessonId,
            "query", query,
            "explanation", "Tính năng giải thích bài học bằng AI đang được phát triển. " +
                          "Vui lòng quay lại sau!",
            "context", "lesson"
        );
        
        return ResponseEntity.ok(response);
    }
}
