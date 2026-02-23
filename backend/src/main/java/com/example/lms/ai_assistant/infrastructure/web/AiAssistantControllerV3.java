package com.example.lms.ai_assistant.infrastructure.web;

import com.example.lms.ai_assistant.application.dto.ChatSessionResponse;
import com.example.lms.ai_assistant.application.dto.CreateChatSessionCommand;
import com.example.lms.ai_assistant.application.dto.SendChatMessageCommand;
import com.example.lms.ai_assistant.application.usecase.ChatSessionUseCaseV3;
import com.example.lms.ai_assistant.infrastructure.persistence.ChatMessageJpaRepository;
import com.example.lms.ai_assistant.infrastructure.persistence.entity.ChatMessageJpaEntity;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import com.example.lms.ai_assistant.application.port.AiChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.util.*;

/**
 * REST Controller for AI Assistant functionality.
 *
 * <p>Proxies chat requests to Wiii AI service for real AI responses.
 * Session management (create, list, archive, delete) stays local.
 * SSE streaming endpoint at {@code /chat/stream} forwards Wiii's SSE events.
 */
@RestController
@RequestMapping("/api/v3/ai")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
@Tag(name = "AI Assistant", description = "AI-powered chat and assistance APIs")
@SecurityRequirement(name = "bearerAuth")
public class AiAssistantControllerV3 {

    private static final Logger log = LoggerFactory.getLogger(AiAssistantControllerV3.class);

    private final ChatSessionUseCaseV3 chatSessionUseCase;
    private final ChatMessageJpaRepository chatMessageRepository;
    private final AiChatService aiChatService;

    // ============== Health Check ==============

    @GetMapping("/health")
    @PreAuthorize("permitAll()")
    @Operation(summary = "Check AI service health status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> healthCheck() {
        Map<String, Object> health = Map.of(
            "status", "healthy",
            "aiServiceStatus", "available",
            "version", "3.0"
        );
        return ResponseEntity.ok(ApiResponse.success(health, "Dịch vụ AI đang hoạt động"));
    }

    // ============== Session Management ==============

    @PostMapping("/sessions")
    @Operation(summary = "Create a new chat session")
    public ResponseEntity<ApiResponse<ChatSessionResponse>> createSession(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestBody @Valid CreateChatSessionCommand command) {

        log.info("Creating chat session for user: {}", user.getId());
        ChatSessionResponse response = chatSessionUseCase.createSession(user.getId(), command);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Tạo phiên trò chuyện thành công"));
    }

    @GetMapping("/sessions")
    @Operation(summary = "Get all chat sessions for current user")
    public ResponseEntity<ApiResponse<List<ChatSessionResponse>>> getUserSessions(
            @AuthenticationPrincipal UserJpaEntity user) {

        List<ChatSessionResponse> sessions = chatSessionUseCase.getUserSessions(user.getId());
        return ResponseEntity.ok(ApiResponse.success(sessions, "Danh sách phiên trò chuyện"));
    }

    @GetMapping("/sessions/{sessionId}")
    @Operation(summary = "Get a specific chat session")
    public ResponseEntity<ApiResponse<ChatSessionResponse>> getSession(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID sessionId) {

        ChatSessionResponse session = chatSessionUseCase.getSession(sessionId);
        verifySessionOwner(session, user.getId());
        return ResponseEntity.ok(ApiResponse.success(session, "Thông tin phiên trò chuyện"));
    }

    @PutMapping("/sessions/{sessionId}/archive")
    @Operation(summary = "Archive a chat session")
    public ResponseEntity<ApiResponse<Void>> archiveSession(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID sessionId) {

        ChatSessionResponse session = chatSessionUseCase.getSession(sessionId);
        verifySessionOwner(session, user.getId());
        chatSessionUseCase.archiveSession(sessionId);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã lưu trữ phiên trò chuyện"));
    }

    @DeleteMapping("/sessions/{sessionId}")
    @Operation(summary = "Delete a chat session")
    public ResponseEntity<ApiResponse<Void>> deleteSession(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID sessionId) {

        ChatSessionResponse session = chatSessionUseCase.getSession(sessionId);
        verifySessionOwner(session, user.getId());
        chatSessionUseCase.deleteSession(sessionId);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa phiên trò chuyện"));
    }

    // ============== Chat Endpoints ==============

    @PostMapping("/sessions/{sessionId}/messages")
    @Operation(summary = "Send a message and get AI response")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendMessage(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID sessionId,
            @RequestBody @Valid SendChatMessageCommand command) {

        log.info("Sending message to session: {}", sessionId);
        ChatSessionResponse session = chatSessionUseCase.getSession(sessionId);
        verifySessionOwner(session, user.getId());

        // Save user message
        ChatMessageJpaEntity userMsg = ChatMessageJpaEntity.builder()
                .sessionId(sessionId)
                .role(ChatMessageJpaEntity.MessageRole.USER)
                .content(command.content())
                .build();
        chatMessageRepository.save(userMsg);

        // Call Wiii AI for real response (fallback to template if unavailable)
        String aiResponse = getAiResponse(user, command.content(), sessionId.toString());

        // Save AI response
        ChatMessageJpaEntity aiMsg = ChatMessageJpaEntity.builder()
                .sessionId(sessionId)
                .role(ChatMessageJpaEntity.MessageRole.ASSISTANT)
                .content(aiResponse)
                .build();
        chatMessageRepository.save(aiMsg);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("sessionId", sessionId);
        response.put("userMessage", Map.of(
                "id", userMsg.getId(), "content", command.content(), "role", "USER", "createdAt", Instant.now()));
        response.put("aiResponse", Map.of(
                "id", aiMsg.getId(), "content", aiResponse, "role", "ASSISTANT", "createdAt", Instant.now()));

        return ResponseEntity.ok(ApiResponse.success(response, "Đã gửi tin nhắn"));
    }

    @GetMapping("/sessions/{sessionId}/messages")
    @Operation(summary = "Get all messages in a session")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSessionMessages(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID sessionId) {

        ChatSessionResponse session = chatSessionUseCase.getSession(sessionId);
        verifySessionOwner(session, user.getId());

        List<ChatMessageJpaEntity> messages = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        List<Map<String, Object>> result = messages.stream().map(m -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", m.getId());
            map.put("role", m.getRole().name());
            map.put("content", m.getContent());
            map.put("createdAt", m.getCreatedAt());
            return map;
        }).toList();

        return ResponseEntity.ok(ApiResponse.success(result, "Danh sách tin nhắn"));
    }

    @PostMapping("/chat")
    @Operation(summary = "Quick chat without session (stateless)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> quickChat(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestBody @Valid SendChatMessageCommand command) {

        log.info("Quick chat from user: {}", user.getId());
        String aiResponse = getAiResponse(user, command.content(), null);

        Map<String, Object> response = Map.of(
            "userId", user.getId(),
            "query", command.content(),
            "response", aiResponse
        );

        return ResponseEntity.ok(ApiResponse.success(response, "Phản hồi trò chuyện"));
    }

    // ============== SSE Streaming ==============

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Stream AI response via Server-Sent Events")
    public SseEmitter streamChat(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestBody @Valid SendChatMessageCommand command) {

        log.info("SSE stream from user: {}", user.getId());
        return aiChatService.streamChat(
                user.getId().toString(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole().name(),
                command.content(),
                null,   // session derived by Wiii
                "maritime"
        );
    }

    // ============== Context-Aware Chat ==============

    @PostMapping("/courses/{courseId}/ask")
    @Operation(summary = "Ask AI about a specific course")
    public ResponseEntity<ApiResponse<Map<String, Object>>> askAboutCourse(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID courseId,
            @RequestBody @Valid SendChatMessageCommand command) {

        log.info("Course context question for course: {}", courseId);
        String contextMessage = "[Ngữ cảnh: Khóa học ID=" + courseId + "] " + command.content();
        String aiResponse = getAiResponse(user, contextMessage, null);

        Map<String, Object> response = Map.of(
            "courseId", courseId,
            "query", command.content(),
            "response", aiResponse,
            "context", "course"
        );

        return ResponseEntity.ok(ApiResponse.success(response, "Phản hồi ngữ cảnh khóa học"));
    }

    @PostMapping("/lessons/{lessonId}/explain")
    @Operation(summary = "Get AI explanation for a lesson")
    public ResponseEntity<ApiResponse<Map<String, Object>>> explainLesson(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID lessonId,
            @Valid @RequestBody(required = false) SendChatMessageCommand command) {

        String query = command != null ? command.content() : "Giải thích bài học này";
        String contextMessage = "[Ngữ cảnh: Bài học ID=" + lessonId + "] " + query;
        String aiResponse = getAiResponse(user, contextMessage, null);

        Map<String, Object> response = Map.of(
            "lessonId", lessonId,
            "query", query,
            "explanation", aiResponse,
            "context", "lesson"
        );

        return ResponseEntity.ok(ApiResponse.success(response, "Giải thích bài học"));
    }

    // ============== Helpers ==============

    private void verifySessionOwner(ChatSessionResponse session, UUID currentUserId) {
        if (session.userId() != null && !session.userId().equals(currentUserId)) {
            throw new AccessDeniedException("Bạn không có quyền truy cập phiên này");
        }
    }

    /**
     * Get AI response from Wiii, with template fallback.
     *
     * <p>Tries Wiii proxy first. If Wiii is unavailable (no config, network error,
     * timeout), falls back to template responses so the app remains functional.
     */
    private String getAiResponse(UserJpaEntity user, String message, String sessionId) {
        try {
            Optional<String> wiiiResponse = aiChatService.chat(
                    user.getId().toString(),
                    user.getEmail(),
                    user.getDisplayName(),
                    user.getRole().name(),
                    message,
                    sessionId,
                    "maritime"
            );
            if (wiiiResponse.isPresent() && !wiiiResponse.get().isBlank()) {
                return wiiiResponse.get();
            }
        } catch (Exception e) {
            log.warn("Wiii proxy failed, using fallback: {}", e.getMessage());
        }

        return fallbackResponse(message);
    }

    /**
     * Fallback response when Wiii is unavailable.
     * Simple acknowledgment — no longer pretends to be a real AI.
     */
    private String fallbackResponse(String userQuery) {
        return "Hệ thống AI đang tạm thời không khả dụng. " +
                "Vui lòng thử lại sau ít phút hoặc liên hệ giảng viên để được hỗ trợ.";
    }
}
